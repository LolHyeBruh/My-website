export interface Video {
  url: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  creator: string;
  addedAt: number;
  views: number;
  lastTime: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  videoCount: number;
  createdAt: number;
  updatedAt: number;
  views?: any;
}

export interface PlaylistData {
  id?: string;
  name?: string;
  videos: Video[];
  description?: string;
  createdAt?: number;
  views?: any;
}


export type PlaylistRecord = Record<string, PlaylistData>;