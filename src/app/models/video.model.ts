export interface Video {
  url: string;
  title: string;
  description: string;
  duration: string; // Format: "10:30"
  addedAt: number; // Timestamp
  views: number;
  category: string;
  lastTime: number; // Resume time
  creator?: string; // Creator name/ID
  thumbnail?: string; // Auto-generated or provided
  playlistId?: string; // Associated playlist
}

export interface PlaylistData {
  videos: Video[];
  sort: 'asc' | 'desc';
  views: Record<string, number>;
  createdAt?: number;
  name?: string;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  videoCount: number;
  createdAt: number;
  updatedAt: number;
}