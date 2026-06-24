export interface TikTokVideoData {
  id: string;
  region: string;
  title: string;
  cover: string;
  duration: number;
  play: string; // HD No Watermark URL usually, or no watermark depending on 'hd' parameter
  wmplay: string; // Watermarked URL
  hdplay: string; // Truly HD play
  images?: string[]; // Array of image URLs for photo slideshows
  music: string; // Audio
  music_info: {
    title: string;
    author: string;
    cover: string;
  };
  author: {
    unique_id: string;
    nickname: string;
    avatar: string;
  };
}
