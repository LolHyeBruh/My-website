import { Video, PlaylistData } from './video.model';

export interface UserDoc {
  playlists?: Record<string, PlaylistData>;
}