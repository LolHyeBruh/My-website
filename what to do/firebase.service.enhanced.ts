import { Injectable } from '@angular/core';
import { User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  getAuth, Auth, signInWithPopup, GoogleAuthProvider,
  onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  getFirestore, Firestore, collection, doc, getDocs,
  setDoc, deleteDoc, updateDoc, DocumentData, writeBatch,
  getDoc, Transaction, runTransaction, query, where
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Video, PlaylistData, Playlist } from '../models/video.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private auth: Auth;
  private db: Firestore;
  private isAdminSubject = new BehaviorSubject(false);
  public isAdmin$ = this.isAdminSubject.asObservable();
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isLoggedInSubject = new BehaviorSubject(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private readonly ADMIN_UID = "FTvdwrjqeCZi9TAZxZXnoWccnDJ3";
  private readonly SHARED_USER_ID = 'shared_user';
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(private cacheService: CacheService) {
    const app = initializeApp(environment.firebase);
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.setupAuthListener();
  }

  // ===== AUTH METHODS =====

  private setupAuthListener(): void {
    onAuthStateChanged(this.auth, async (user: User | null) => {
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(!!user);
      if (user && user.uid === this.ADMIN_UID) {
        this.isAdminSubject.next(true);
        console.log('Admin user logged in');
      } else {
        this.isAdminSubject.next(false);
      }
    });
  }

  async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.cacheService.clear();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // ===== PLAYLIST METHODS =====

  async createPlaylist(playlistName: string, description: string = ''): Promise<void> {
    return this.retryOperation(() => this._createPlaylist(playlistName, description));
  }

  private async _createPlaylist(playlistName: string, description: string = ''): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      await setDoc(playlistRef, {
        videos: [],
        sort: 'asc',
        views: {},
        createdAt: Date.now(),
        name: playlistName,
        description: description
      });
      console.log(`Created playlist: ${playlistName}`);
      this.cacheService.invalidate('playlists');
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistName: string): Promise<void> {
    return this.retryOperation(() => this._deletePlaylist(playlistName));
  }

  private async _deletePlaylist(playlistName: string): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      await deleteDoc(playlistRef);
      this.cacheService.invalidate('playlists');
      this.cacheService.invalidate(`playlist_${playlistName}`);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  async getPlaylistList(): Promise<Playlist[]> {
    try {
      const cached = this.cacheService.get('playlists');
      if (cached) return cached;

      const playlistsCollectionRef = collection(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists'
      );
      const snapshot = await getDocs(playlistsCollectionRef);
      const playlists: Playlist[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as PlaylistData;
        playlists.push({
          id: doc.id,
          name: data.name || doc.id,
          description: data.description || '',
          videoCount: (data.videos || []).length,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.createdAt || Date.now()
        });
      }

      this.cacheService.set('playlists', playlists, 5 * 60 * 1000); // 5 min cache
      return playlists;
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  // ===== VIDEO METHODS =====

  async addVideo(playlistName: string, video: Video): Promise<void> {
    return this.retryOperation(() => this._addVideo(playlistName, video));
  }

  private async _addVideo(playlistName: string, video: Video): Promise<void> {
    try {
      await this.createPlaylistIfNotExists(playlistName);
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      const enrichedVideo: Video = {
        ...video,
        addedAt: video.addedAt || Date.now(),
        views: video.views || 0,
        lastTime: video.lastTime || 0,
        category: video.category || 'Uncategorized'
      };

      await runTransaction(this.db, async (transaction) => {
        const playlistDoc = await transaction.get(playlistRef);
        const data = (playlistDoc.data() || {}) as PlaylistData;
        const videos = data.videos || [];
        videos.push(enrichedVideo);
        transaction.update(playlistRef, {
          videos,
          updatedAt: Date.now()
        });
      });

      this.cacheService.invalidate(`playlist_${playlistName}`);
    } catch (error) {
      console.error('Error adding video:', error);
      throw error;
    }
  }

  async deleteVideo(playlistName: string, videoUrl: string): Promise<void> {
    return this.retryOperation(() => this._deleteVideo(playlistName, videoUrl));
  }

  private async _deleteVideo(playlistName: string, videoUrl: string): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      await runTransaction(this.db, async (transaction) => {
        const playlistDoc = await transaction.get(playlistRef);
        const data = (playlistDoc.data() || {}) as PlaylistData;
        const videos = (data.videos || []).filter(v => v.url !== videoUrl);
        const views = { ...data.views };
        delete views[encodeURIComponent(videoUrl)];
        transaction.update(playlistRef, { videos, views });
      });

      this.cacheService.invalidate(`playlist_${playlistName}`);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  async updateVideo(playlistName: string, videoUrl: string, updates: Partial<Video>): Promise<void> {
    return this.retryOperation(() => this._updateVideo(playlistName, videoUrl, updates));
  }

  private async _updateVideo(playlistName: string, videoUrl: string, updates: Partial<Video>): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      await runTransaction(this.db, async (transaction) => {
        const playlistDoc = await transaction.get(playlistRef);
        const data = (playlistDoc.data() || {}) as PlaylistData;
        const videos = data.videos || [];
        const updatedVideos = videos.map(v =>
          v.url === videoUrl ? { ...v, ...updates } : v
        );
        transaction.update(playlistRef, {
          videos: updatedVideos,
          updatedAt: Date.now()
        });
      });

      this.cacheService.invalidate(`playlist_${playlistName}`);
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  async loadPlaylists(): Promise<Record<string, Video[]>> {
    try {
      const playlists = await this.getPlaylistList();
      const result: Record<string, Video[]> = {};
      for (const playlist of playlists) {
        result[playlist.name] = await this.loadPlaylist(playlist.name);
      }
      return result;
    } catch (error) {
      console.error('Error loading playlists:', error);
      return {};
    }
  }

  async loadPlaylist(playlistName: string): Promise<Video[]> {
    try {
      const cached = this.cacheService.get(`playlist_${playlistName}`);
      if (cached) return cached;

      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      const playlistDoc = await getDoc(playlistRef);
      const data = (playlistDoc.data() || {}) as PlaylistData;
      const videos = data.videos || [];

      this.cacheService.set(`playlist_${playlistName}`, videos, 5 * 60 * 1000);
      return videos;
    } catch (error) {
      console.error('Error loading playlist:', error);
      return [];
    }
  }

  async createPlaylistIfNotExists(playlistName: string): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      const playlistDoc = await getDoc(playlistRef);
      if (!playlistDoc.exists()) {
        await this.createPlaylist(playlistName);
      }
    } catch (error) {
      console.error('Error checking playlist existence:', error);
    }
  }

  // ===== VIEW TRACKING =====

  async updateVideoViews(playlistName: string, videoUrl: string, viewCount: number = 1): Promise<void> {
    return this.retryOperation(() => this._updateVideoViews(playlistName, videoUrl, viewCount));
  }

  private async _updateVideoViews(playlistName: string, videoUrl: string, viewCount: number = 1): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      const encodedUrl = encodeURIComponent(videoUrl);

      await runTransaction(this.db, async (transaction) => {
        const playlistDoc = await transaction.get(playlistRef);
        const data = (playlistDoc.data() || {}) as PlaylistData;
        const views = data.views || {};
        views[encodedUrl] = (views[encodedUrl] || 0) + viewCount;
        transaction.update(playlistRef, { views });
      });

      this.cacheService.invalidate(`playlist_${playlistName}`);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  }

  async preloadViewCounts(playlistName: string): Promise<Record<string, number>> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      const playlistDoc = await getDoc(playlistRef);
      const data = (playlistDoc.data() || {}) as PlaylistData;
      const views = data.views || {};
      const viewCache: Record<string, number> = {};

      for (const encodedUrl in views) {
        const url = decodeURIComponent(encodedUrl);
        viewCache[url] = views[encodedUrl] || 0;
      }

      return viewCache;
    } catch (error) {
      console.error('Error preloading view counts:', error);
      return {};
    }
  }

  // ===== WATCH POSITION TRACKING =====

  async updateVideoWatchPosition(playlistName: string, videoUrl: string, time: number): Promise<void> {
    return this.retryOperation(() => this._updateVideoWatchPosition(playlistName, videoUrl, time));
  }

  private async _updateVideoWatchPosition(playlistName: string, videoUrl: string, time: number): Promise<void> {
    try {
      const userId = this.currentUserSubject.value?.uid;
      if (!userId) return;

      const historyRef = doc(
        this.db,
        'watch_history',
        userId,
        encodeURIComponent(videoUrl),
        'position'
      );

      await setDoc(historyRef, {
        lastWatchTime: time,
        lastViewedAt: Date.now(),
        url: videoUrl,
        playlistName: playlistName
      }, { merge: true });
    } catch (error) {
      console.error('Error updating watch position:', error);
    }
  }

  async getVideoWatchPosition(videoUrl: string): Promise<number> {
    try {
      const userId = this.currentUserSubject.value?.uid;
      if (!userId) return 0;

      const historyRef = doc(
        this.db,
        'watch_history',
        userId,
        encodeURIComponent(videoUrl),
        'position'
      );

      const docSnap = await getDoc(historyRef);
      if (docSnap.exists()) {
        return docSnap.data()['lastWatchTime'] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting watch position:', error);
      return 0;
    }
  }

  // ===== UTILITY METHODS =====

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number = this.RETRY_ATTEMPTS
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempts > 1) {
        console.warn(`Operation failed, retrying... (${this.RETRY_ATTEMPTS - attempts + 1}/${this.RETRY_ATTEMPTS})`);
        await this.delay(this.RETRY_DELAY);
        return this.retryOperation(operation, attempts - 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAuth(): Auth {
    return this.auth;
  }

  getDb(): Firestore {
    return this.db;
  }

  isAdminUser(): boolean {
    return this.isAdminSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }
}
