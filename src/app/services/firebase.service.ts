import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, Auth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore, collection, doc, getDocs, setDoc, deleteDoc, updateDoc, DocumentData, writeBatch, getDoc, Transaction, runTransaction } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Video, PlaylistData } from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private auth: Auth;
  private db: Firestore;
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable();
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly ADMIN_UID = "FTvdwrjqeCZi9TAZxZXnoWccnDJ3";
  private readonly SHARED_USER_ID = 'shared_user';

  constructor() {
    const app = initializeApp(environment.firebase);
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.setupAuthListener();
  }

  private setupAuthListener(): void {
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUserSubject.next(user);
      if (user && user.uid === this.ADMIN_UID) {
        this.isAdminSubject.next(true);
        console.log('Admin user logged in');
      } else {
        this.isAdminSubject.next(false);
      }
    });
  }

  async loginWithGoogle(): Promise<any> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
        await setDoc(playlistRef, {
          videos: [],
          sort: 'asc',
          views: {}
        });
        console.log(`Created playlist: ${playlistName}`);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async loadPlaylists(): Promise<Record<string, Video[]>> {
    try {
      const playlistsCollectionRef = collection(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists'
      );

      const snapshot = await getDocs(playlistsCollectionRef);
      const playlists: Record<string, Video[]> = {};

      for (const doc of snapshot.docs) {
        const data = doc.data() as PlaylistData;
        playlists[doc.id] = data.videos || [];
      }

      return playlists;
    } catch (error) {
      console.error('Error loading playlists:', error);
      return {};
    }
  }

  async savePlaylist(playlistName: string, videos: Video[], sort: string = 'asc'): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      const sanitizedVideos = videos.map(v => ({
        url: v.url || '',
        title: v.title || '',
        description: v.description || '',
        duration: v.duration || '00:00:00',
        addedAt: v.addedAt || Date.now(),
        views: v.views || 0,
        category: v.category || 'Uncategorized',
        lastTime: v.lastTime || 0
      }));

      await setDoc(
        playlistRef,
        { videos: sanitizedVideos, sort },
        { merge: false }
      );
    } catch (error) {
      console.error('Error saving playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistName: string): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );
      await deleteDoc(playlistRef);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  async updateVideoViews(playlistName: string, videoUrl: string, viewCount: number): Promise<void> {
    try {
      const playlistRef = doc(
        this.db,
        'users',
        this.SHARED_USER_ID,
        'playlists',
        playlistName
      );

      const encodedUrl = encodeURIComponent(videoUrl);

      await runTransaction(this.db, async (transaction: Transaction) => {
        const playlistDoc = await transaction.get(playlistRef);
        const data = (playlistDoc.data() || {}) as PlaylistData;
        const views = data.views || {};

        views[encodedUrl] = (views[encodedUrl] || 0) + viewCount;
        transaction.update(playlistRef, { views });
      });
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

  getAuth(): Auth {
    return this.auth;
  }

  getDb(): Firestore {
    return this.db;
  }

  isAdminUser(): boolean {
    return this.isAdminSubject.value;
  }

  getSharedUserId(): string {
    return this.SHARED_USER_ID;
  }
}