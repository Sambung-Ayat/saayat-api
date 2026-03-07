import { Injectable, Logger } from '@nestjs/common';
import { Ayah, AlQuranResponse } from '../common/interfaces/quran.interface';

@Injectable()
export class AlquranService {
  private readonly logger = new Logger(AlquranService.name);
  
  private readonly ayahCache = new Map<number, Ayah>();
  
  private readonly BASE_URL = 'https://api.alquran.cloud/v1';
  private readonly EDITION = 'quran-uthmani';

  async fetchAyahByGlobalNumber(number: number): Promise<Ayah> {
    if (this.ayahCache.has(number)) {
      return this.ayahCache.get(number)!;
    }

    try {
      const data = await this.fetchWithRetry(`${this.BASE_URL}/ayah/${number}/${this.EDITION}`);
      const response: AlQuranResponse<Ayah> = await data.json();

      if (response.code !== 200 || !response.data) {
        throw new Error(`Failed to fetch ayah ${number}: ${response.status}`);
      }

      this.ayahCache.set(number, response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching ayah ${number}:`, error);
      throw error;
    }
  }

  async fetchRandomAyah(): Promise<Ayah> {
    const randomNum = Math.floor(Math.random() * 6235) + 1;
    return this.fetchAyahByGlobalNumber(randomNum);
  }

  async fetchNextAyah(currentGlobalNumber: number): Promise<Ayah> {
    if (currentGlobalNumber >= 6236) {
      throw new Error('No next ayah available (end of Quran)');
    }
    return this.fetchAyahByGlobalNumber(currentGlobalNumber + 1);
  }

  async fetchJuz(juzNumber: number): Promise<Ayah[]> {
    if (juzNumber < 1 || juzNumber > 30) {
      throw new Error('Juz number must be between 1 and 30');
    }

    const url = `${this.BASE_URL}/juz/${juzNumber}/${this.EDITION}`;
    
    try {
      const data = await this.fetchWithRetry(url);
      const response: AlQuranResponse<{ ayahs: Ayah[] }> = await data.json();

      if (response.code !== 200 || !response.data) {
        throw new Error(`Failed to fetch Juz ${juzNumber}: ${response.status}`);
      }

      response.data.ayahs.forEach(ayah => {
        this.ayahCache.set(ayah.number, ayah);
      });

      return response.data.ayahs;
    } catch (error) {
      this.logger.error(`Error fetching Juz ${juzNumber}:`, error);
      throw error;
    }
  }

  async fetchAyahDetails(number: number, lang: 'id' | 'en' = 'id'): Promise<{ audio: string; translation: string }> {
    const translationEdition = lang === 'en' ? 'en.sahih' : 'id.indonesian';
    const url = `${this.BASE_URL}/ayah/${number}/editions/ar.alafasy,${translationEdition}`;
    
    try {
      const data = await this.fetchWithRetry(url);
      const response = await data.json();

      if (response.code !== 200 || !response.data) {
        throw new Error(`Failed to fetch ayah details ${number}: ${response.status}`);
      }

      const audioData = response.data.find((item: any) => item.edition?.identifier === 'ar.alafasy');
      const translationData = response.data.find((item: any) => item.edition?.identifier === translationEdition);

      return {
        audio: audioData?.audio || '',
        translation: translationData?.text || ''
      };
    } catch (error) {
      this.logger.error(`Error fetching details for ayah ${number}:`, error);
      return { audio: '', translation: '' };
    }
  }

  private async fetchWithRetry(url: string, retries = 1, timeoutMs = 5000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      clearTimeout(id);
      if (retries > 0) {
        this.logger.warn(`Retrying fetch for ${url}...`);
        return this.fetchWithRetry(url, retries - 1, timeoutMs);
      }
      throw error;
    }
  }
}