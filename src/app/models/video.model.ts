export interface Video {
  url: string;
  title: string;
  description?: string;
  duration?: string;
  category?: string;
  views?: number;
  addedAt?: number;
  lastTime?: number;
  _hasCountedView?: boolean;
}

export interface PlaylistData {
  videos: Video[];
  sort?: string;
  views?: Record<string, number>;
}

export interface Playlist {
  [playlistName: string]: Video[];
}