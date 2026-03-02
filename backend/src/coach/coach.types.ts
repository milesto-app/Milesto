export interface Coach {
  id: number;
  personality: string;
  display_name_fr: string;
  display_name_en: string;
  description_fr: string;
  description_en: string;
  icon: string;
  deepgram_voice_id: string;
  deepgram_voice_model: string;
  is_active: boolean;
}
