import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseIngestionService, RawEvent } from './base.service';

interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
  items?: string;
  size?: number;
  isXBRL?: boolean;
  cik: string;
  companyName?: string;
  ticker?: string;
}

interface Form4Filing {
  accessionNumber: string;
  filingDate: string;
  reportingOwner: string;
  issuerName: string;
  issuerTicker?: string;
  transactionDate: string;
  transactionType: string; // 'P' = purchase, 'S' = sale
  sharesTraded: number;
  pricePerShare: number;
  sharesOwnedAfter: number;
}

@Injectable()
export class EdgarService extends BaseIngestionService {
  protected readonly logger = new Logger(EdgarService.name);
  protected readonly sourceName = 'EDGAR';

  private readonly baseUrl = 'https://data.sec.gov';
  private readonly userAgent: string;

  constructor(private configService: ConfigService) {
    super();
    // SEC requires user agent with contact info
    this.userAgent =
      this.configService.get('SEC_USER_AGENT') ||
      'Skynet/1.0 (contact@example.com)';
  }

  async fetch(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    try {
      // Fetch recent Form 4 filings (insider trades)
      const form4Events = await this.fetchForm4Filings();
      events.push(...form4Events);

      // Fetch recent 8-K filings (material events)
      const form8KEvents = await this.fetch8KFilings();
      events.push(...form8KEvents);
    } catch (error) {
      this.logger.error(`EDGAR fetch error: ${error.message}`);
    }

    return events;
  }

  async fetchForm4Filings(): Promise<RawEvent[]> {
    // SEC EDGAR API for recent Form 4 filings
    // Using the full-text search API
    const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&count=100&output=atom`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/atom+xml',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      });

      // Parse the XML response (simplified - in production use proper XML parser)
      const events = this.parseForm4Atom(response);
      this.logger.log(`Fetched ${events.length} Form 4 filings`);
      return events;
    } catch (error) {
      this.logger.error(`Form 4 fetch error: ${error.message}`);
      return [];
    }
  }

  async fetch8KFilings(): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=50&output=atom`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/atom+xml',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      });

      const events = this.parse8KAtom(response);
      this.logger.log(`Fetched ${events.length} 8-K filings`);
      return events;
    } catch (error) {
      this.logger.error(`8-K fetch error: ${error.message}`);
      return [];
    }
  }

  private parseForm4Atom(xml: string): RawEvent[] {
    const events: RawEvent[] = [];

    // Simple regex-based parsing (use proper XML parser in production)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/;
    const updatedRegex = /<updated>([^<]+)<\/updated>/;
    const linkRegex = /<link[^>]*href="([^"]+)"/;

    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const titleMatch = entry.match(titleRegex);
      const updatedMatch = entry.match(updatedRegex);
      const linkMatch = entry.match(linkRegex);

      if (titleMatch && updatedMatch) {
        const title = titleMatch[1];
        const timestamp = this.parseDate(updatedMatch[1]);

        // Parse title for company/ticker info
        // Format usually: "4 - Company Name (TICKER) (Reporter Name)"
        const tickerMatch = title.match(/\(([A-Z]{1,5})\)/);
        const companyMatch = title.match(/4\s*-\s*([^(]+)/);

        if (timestamp) {
          events.push({
            timestamp,
            eventType: 'insider_trade',
            entity: tickerMatch?.[1] || companyMatch?.[1]?.trim(),
            metadata: {
              formType: '4',
              title,
              link: linkMatch?.[1],
              companyName: companyMatch?.[1]?.trim(),
              ticker: tickerMatch?.[1],
            },
          });
        }
      }
    }

    return events;
  }

  private parse8KAtom(xml: string): RawEvent[] {
    const events: RawEvent[] = [];

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/;
    const updatedRegex = /<updated>([^<]+)<\/updated>/;
    const linkRegex = /<link[^>]*href="([^"]+)"/;
    const summaryRegex = /<summary[^>]*>([^<]+)<\/summary>/;

    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const titleMatch = entry.match(titleRegex);
      const updatedMatch = entry.match(updatedRegex);
      const linkMatch = entry.match(linkRegex);
      const summaryMatch = entry.match(summaryRegex);

      if (titleMatch && updatedMatch) {
        const title = titleMatch[1];
        const timestamp = this.parseDate(updatedMatch[1]);
        const tickerMatch = title.match(/\(([A-Z]{1,5})\)/);

        if (timestamp) {
          events.push({
            timestamp,
            eventType: 'sec_8k',
            entity: tickerMatch?.[1],
            metadata: {
              formType: '8-K',
              title,
              link: linkMatch?.[1],
              summary: summaryMatch?.[1],
            },
          });
        }
      }
    }

    return events;
  }
}
