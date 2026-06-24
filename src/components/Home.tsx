import React, { useState } from 'react';
import { Download, Search, CheckCircle2, AlertCircle, Loader2, Music, Image as ImageIcon, Video, Star, Clock, Trash2, Copy, Check, User, Grid, Clipboard } from 'lucide-react';
import { motion } from 'motion/react';
import { TikTokVideoData } from '../types';
import JSZip from 'jszip';

const formatCount = (num: number | undefined | null) => {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString();
};

export function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<TikTokVideoData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_tiktok_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State to hold all processed/downloaded single videos with thumbnails and titles
  const [processedVideos, setProcessedVideos] = useState<TikTokVideoData[]>(() => {
    try {
      const saved = localStorage.getItem('processed_tiktok_videos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mode state: 'single' (traditional single download) or 'profile' (bulk download)
  const [mode, setMode] = useState<'single' | 'profile'>('single');
  
  // Profile state
  const [profileQuery, setProfileQuery] = useState('');
  const [profileVideos, setProfileVideos] = useState<any[]>([]);
  const [profileCursor, setProfileCursor] = useState('0');
  const [profileHasMore, setProfileHasMore] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkDownloadMode, setBulkDownloadMode] = useState<'zip' | 'individual'>('zip');
  const [zipPackagingPercent, setZipPackagingPercent] = useState<number | null>(null);
  const [zipStatusMessage, setZipStatusMessage] = useState<string>('');
  const [isDownloadingAllAsZip, setIsDownloadingAllAsZip] = useState(false);
  const [downloadAllProgressMessage, setDownloadAllProgressMessage] = useState('');
  const [completedZipData, setCompletedZipData] = useState<{url: string, filename: string} | null>(null);

  // References to input elements for programmatic focus on paste request
  const singleInputRef = React.useRef<HTMLInputElement>(null);
  const profileInputRef = React.useRef<HTMLInputElement>(null);

  // Clipboard paste helper state
  const [showPasteTooltip, setShowPasteTooltip] = useState<'single' | 'profile' | null>(null);

  // Controlled bulk downloading queue states
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'pending' | 'downloading' | 'completed' | 'failed' | 'retrying'>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  // Dynamic automatic load-more target limit
  const [loadingTargetCount, setLoadingTargetCount] = useState<number | null>(null);

  const handlePaste = async (target: 'single' | 'profile') => {
    // Focus the target input first to prepare for user paste
    if (target === 'single') {
      singleInputRef.current?.focus();
    } else {
      profileInputRef.current?.focus();
    }

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (target === 'single') {
            setUrl(text.trim());
          } else {
            setProfileQuery(text.trim());
          }
          return; // Successfully pasted programmatically
        }
      }
    } catch (err: any) {
      console.warn('Programmatic clipboard access blocked in iframe:', err.message || err);
    }

    // Fallback: Trigger our elegant animated tooltip pointing directly to the focus
    setShowPasteTooltip(target);
    setTimeout(() => {
      setShowPasteTooltip(null);
    }, 4000);
  };

  const fetchProfile = async (isLoadMore = false) => {
    if (!profileQuery.trim()) return;

    setProfileLoading(true);
    setProfileError(null);
    if (!isLoadMore) {
      setProfileVideos([]);
      setSelectedVideos([]);
      setProfileStats(null);
      setProfileUser(null);
    }

    try {
      const cursorToUse = isLoadMore ? profileCursor : '0';
      const response = await fetch(`/api/profile?username=${encodeURIComponent(profileQuery)}&cursor=${cursorToUse}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch profile videos');
      }

      if (!isLoadMore) {
        setProfileStats(result.stats || null);
        setProfileUser(result.user || null);
      }

      if (result.videos && result.videos.length > 0) {
        setProfileVideos((prev) => isLoadMore ? [...prev, ...result.videos] : result.videos);
        setProfileCursor(result.cursor || '0');
        setProfileHasMore(result.hasMore || false);
      } else {
        if (!isLoadMore) {
          throw new Error('No videos found for this creator or profile is private.');
        } else {
          setProfileHasMore(false);
        }
      }
    } catch (err: any) {
      setProfileError(err.message || 'Something went wrong while fetching the profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Automated loop to fetch profile videos until a target count (e.g., 500) is reached or no more exist
  const fetchProfileUntilTarget = async (targetCount: number) => {
    if (!profileQuery.trim() || profileLoading) return;

    setProfileLoading(true);
    setProfileError(null);
    setLoadingTargetCount(targetCount);

    let currentCursor = profileCursor;
    let currentVideos = [...profileVideos];
    let hasMore = true;

    try {
      while (currentVideos.length < targetCount) {
        // Fetch next page of 50 videos
        const response = await fetch(`/api/profile?username=${encodeURIComponent(profileQuery)}&cursor=${currentCursor}&count=50`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch more profile videos');
        }

        if (result.videos && result.videos.length > 0) {
          // Filter duplicates just in case
          const existingIds = new Set(currentVideos.map(v => v.id));
          const newVideos = result.videos.filter((v: any) => !existingIds.has(v.id));

          if (newVideos.length === 0) {
            // No new videos returned
            hasMore = false;
            setProfileHasMore(false);
            break;
          }

          currentVideos = [...currentVideos, ...newVideos];
          currentCursor = result.cursor || '0';
          hasMore = result.hasMore || false;

          setProfileVideos(currentVideos);
          setProfileCursor(currentCursor);
          setProfileHasMore(hasMore);

          if (!hasMore) {
            break;
          }

          // Respect API rate limits with a short sleep
          await new Promise((resolve) => setTimeout(resolve, 800));
        } else {
          hasMore = false;
          setProfileHasMore(false);
          break;
        }
      }
    } catch (err: any) {
      setProfileError(err.message || 'Something went wrong while fetching more profile videos.');
    } finally {
      setProfileLoading(false);
      setLoadingTargetCount(null);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Allow ample time for the browser to start download stream before URL revocation
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  };

  const downloadSingleVideoWithProgress = async (
    videoUrl: string, 
    filename: string, 
    videoId: string, 
    triggerDownloadImmediate = true,
    retryCount = 3
  ): Promise<Blob> => {
    let attempt = 0;
    while (attempt < retryCount) {
      try {
        if (attempt > 0) {
          setDownloadStatus(prev => ({ ...prev, [videoId]: 'retrying' }));
          await new Promise(r => setTimeout(r, 1500)); // wait before retry
        } else {
          setDownloadStatus(prev => ({ ...prev, [videoId]: 'downloading' }));
        }

        let targetUrl = videoUrl;
      if (targetUrl.startsWith('/')) {
        targetUrl = `https://www.tikwm.com${targetUrl}`;
      }
      
      const response = await fetch(`/api/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`);
      if (!response.ok) {
        let errBody = '';
        try {
          const errData = await response.json();
          errBody = errData.error || '';
        } catch {
          errBody = await response.text().catch(() => '');
        }
        throw new Error(`HTTP error ${response.status}: ${errBody}`);
      }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (!response.body) {
          // Fallback if reader stream is missing
          const blob = await response.blob();
          if (triggerDownloadImmediate) {
            triggerBlobDownload(blob, filename);
          }
          setDownloadStatus(prev => ({ ...prev, [videoId]: 'completed' }));
          setDownloadProgress(prev => ({ ...prev, [videoId]: 100 }));
          return blob;
        }

        const reader = response.body.getReader();
        let loadedBytes = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loadedBytes += value.length;
            if (totalBytes > 0) {
              const percent = Math.round((loadedBytes / totalBytes) * 100);
              setDownloadProgress(prev => ({ ...prev, [videoId]: percent }));
            }
          }
        }

        const combinedBlob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
        if (triggerDownloadImmediate) {
          triggerBlobDownload(combinedBlob, filename);
        }
        setDownloadStatus(prev => ({ ...prev, [videoId]: 'completed' }));
        setDownloadProgress(prev => ({ ...prev, [videoId]: 100 }));
        return combinedBlob; // download succeeded
      } catch (err: any) {
        const errMsg = err.message || err.toString();
        console.error(`Attempt ${attempt + 1} failed for video ${videoId}. Cause:`, errMsg);
        attempt++;
        if (attempt >= retryCount) {
          setDownloadStatus(prev => ({ ...prev, [videoId]: 'failed' }));
          throw new Error(`Failed to download video ${videoId} after ${retryCount} retries. Last error: ${errMsg}`);
        }
      }
    }

  };

  const handleBulkDownloadSelected = async () => {
    if (selectedVideos.length === 0 || bulkDownloading) return;
    setBulkDownloading(true);
    setBulkProgress(0);
    setZipPackagingPercent(null);
    if (completedZipData) {
      URL.revokeObjectURL(completedZipData.url);
      setCompletedZipData(null);
    }
    setZipStatusMessage('Preparing download queue...');

    const videosToDownload = profileVideos.filter(v => selectedVideos.includes(v.id));
    const ids = videosToDownload.map(v => v.id);

    // Reset status and progress maps
    const initialStatuses: Record<string, 'pending' | 'downloading' | 'completed' | 'failed' | 'retrying'> = {};
    const initialProgress: Record<string, number> = {};
    ids.forEach(id => {
      initialStatuses[id] = 'pending';
      initialProgress[id] = 0;
    });
    setDownloadStatus(initialStatuses);
    setDownloadProgress(initialProgress);

    const isZipMode = bulkDownloadMode === 'zip';
    let zip: JSZip | null = null;
    if (isZipMode) {
      zip = new JSZip();
      setZipStatusMessage('Downloading TikTok videos in stream...');
    }

    for (let i = 0; i < videosToDownload.length; i++) {
      const video = videosToDownload[i];
      const videoUrl = video.hdplay || video.play;
      if (!videoUrl) {
        setDownloadStatus(prev => ({ ...prev, [video.id]: 'failed' }));
        continue;
      }

      // Format clean descriptive filename using unique ID and title snippet
      const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
      const filename = `tiktok_hd_${video.id}${cleanTitle ? '_' + cleanTitle : ''}.mp4`;

      try {
        const blob = await downloadSingleVideoWithProgress(videoUrl, filename, video.id, !isZipMode);
        if (isZipMode && zip && blob) {
          zip.file(filename, blob);
        }
        setBulkProgress(i + 1);
      } catch (err) {
        console.error(`Skipping download for video ID ${video.id} due to network error:`, err);
      }

      // Standardize queue delay to keep the requests clean and respectful
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (isZipMode && zip) {
      try {
        setZipStatusMessage('Compiling and generating your single ZIP archive...');
        setZipPackagingPercent(0);
        
        const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
          setZipPackagingPercent(Math.round(metadata.percent));
        });

        setZipStatusMessage('ZIP archive ready. Please save to device.');
        const zipFilename = `tiktok_bulk_${profileUser?.uniqueId || 'profile'}_${Date.now()}.zip`;
        const blobUrl = URL.createObjectURL(zipBlob);
        setCompletedZipData({ url: blobUrl, filename: zipFilename });
        setZipStatusMessage('');
      } catch (zipErr) {
        console.error('Error generating ZIP:', zipErr);
        setZipStatusMessage('Error: Failed to package ZIP file.');
      }
    }

    setBulkDownloading(false);
    setZipPackagingPercent(null);
  };

  const handleDownloadAllProfileVideosAsZip = async () => {
    if (!profileQuery.trim() || profileLoading || bulkDownloading || isDownloadingAllAsZip) return;
    
    setIsDownloadingAllAsZip(true);
    if (completedZipData) {
      URL.revokeObjectURL(completedZipData.url);
      setCompletedZipData(null);
    }
    setDownloadAllProgressMessage('ধাপ ১: প্রোফাইলের সব ভিডিওর লিংক লোড করা হচ্ছে...');

    let currentVideos = [...profileVideos];
    let currentCursor = profileCursor;
    let hasMore = profileHasMore;

    try {
      // Step 1: Force load ALL remaining videos in the profile
      while (hasMore) {
        setDownloadAllProgressMessage(`প্রোফাইলের সব ভিডিওর লিংক লোড করা হচ্ছে... (সংগৃহীত: ${currentVideos.length} টি)`);
        
        const response = await fetch(`/api/profile?username=${encodeURIComponent(profileQuery)}&cursor=${currentCursor}&count=50`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch profile videos during download-all flow');
        }

        if (result.videos && result.videos.length > 0) {
          const existingIds = new Set(currentVideos.map(v => v.id));
          const newVideos = result.videos.filter((v: any) => !existingIds.has(v.id));

          if (newVideos.length === 0) {
            hasMore = false;
            break;
          }

          currentVideos = [...currentVideos, ...newVideos];
          currentCursor = result.cursor || '0';
          hasMore = result.hasMore || false;

          setProfileVideos(currentVideos);
          setProfileCursor(currentCursor);
          setProfileHasMore(hasMore);

          if (!hasMore) {
            break;
          }

          // Sleep slightly to prevent rate limit blocks
          await new Promise((resolve) => setTimeout(resolve, 800));
        } else {
          hasMore = false;
          break;
        }
      }

      // Step 2: Set select all state
      const allIds = currentVideos.map(v => v.id);
      setSelectedVideos(allIds);

      // Step 3: Trigger download sequential pipeline
      setDownloadAllProgressMessage(`ধাপ ২: সব ভিডিও ডাউনলোড শুরু হচ্ছে... (মোট ভিডিও: ${currentVideos.length} টি)`);
      
      setBulkDownloading(true);
      setBulkProgress(0);
      setZipPackagingPercent(null);
      setZipStatusMessage('Downloading TikTok videos in stream...');

      const initialStatuses: Record<string, 'pending' | 'downloading' | 'completed' | 'failed' | 'retrying'> = {};
      const initialProgress: Record<string, number> = {};
      allIds.forEach(id => {
        initialStatuses[id] = 'pending';
        initialProgress[id] = 0;
      });
      setDownloadStatus(initialStatuses);
      setDownloadProgress(initialProgress);

      const zip = new JSZip();

      for (let i = 0; i < currentVideos.length; i++) {
        const video = currentVideos[i];
        const videoUrl = video.hdplay || video.play;
        
        const shortTitle = video.title ? (video.title.slice(0, 22) + '...') : 'No Title';
        setDownloadAllProgressMessage(`ধাপ ২: ভিডিও ডাউনলোড হচ্ছে - ${i + 1} / ${currentVideos.length} (${shortTitle})`);

        if (!videoUrl) {
          setDownloadStatus(prev => ({ ...prev, [video.id]: 'failed' }));
          continue;
        }

        const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
        const filename = `tiktok_hd_${video.id}${cleanTitle ? '_' + cleanTitle : ''}.mp4`;

        try {
          // Download directly to blob without triggering individual browser prompt (saves mobile permission popups!)
          const blob = await downloadSingleVideoWithProgress(videoUrl, filename, video.id, false);
          if (blob) {
            zip.file(filename, blob);
          }
          setBulkProgress(i + 1);
        } catch (err) {
          console.error(`Skipping download for video ID ${video.id} due to error:`, err);
        }

        // Sleep delay to ensure high-speed, reliable download queue
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Step 4: Zip compile phase
      setDownloadAllProgressMessage('ধাপ ৩: জিপ ফাইলে কম্পাইল করা হচ্ছে... (ZIP packaging)');
      setZipStatusMessage('Compiling and generating your single ZIP archive...');
      setZipPackagingPercent(0);

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipPackagingPercent(Math.round(metadata.percent));
        setDownloadAllProgressMessage(`জিপ ফাইলে কম্পাইল করা হচ্ছে: ${Math.round(metadata.percent)}% সম্পন্ন`);
      });

      setZipStatusMessage('Saving single ZIP archive onto your device...');
      setDownloadAllProgressMessage('ডাউনলোড সম্পন্ন! জিপ ফাইলটি আপনার ডিভাইসে সেভ করা হচ্ছে...');
      
      const zipFilename = `tiktok_all_videos_${profileUser?.uniqueId || 'profile'}_${Date.now()}.zip`;
      
      // Instead of programmatic download, we create a URL and wait for the user to click it
      const blobUrl = URL.createObjectURL(zipBlob);
      setCompletedZipData({ url: blobUrl, filename: zipFilename });
      
      // Clean states
      setZipStatusMessage('');
      setZipPackagingPercent(null);
      setBulkDownloading(false);

    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || 'Error occurred during All Videos ZIP download flow.');
    } finally {
      setIsDownloadingAllAsZip(false);
      setDownloadAllProgressMessage('');
    }
  };

  const fetchVideo = async (e?: React.FormEvent, urlOverride?: string) => {
    if (e) e.preventDefault();
    const targetUrl = urlOverride || url;
    if (!targetUrl.trim()) return;

    if (!targetUrl.includes('tiktok.com')) {
      setError('Please enter a valid TikTok URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoData(null);

    try {
      const response = await fetch(`/api/video?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video details.');
      }

      if (data.isProfile) {
        // Switch layout to profile mode and initiate profile loading
        setMode('profile');
        setProfileQuery(data.username);
        setProfileLoading(true);
        setProfileError(null);
        setProfileVideos([]);
        setSelectedVideos([]);
        
        try {
          const profileRes = await fetch(`/api/profile?username=${encodeURIComponent(data.username)}&cursor=0`);
          const result = await profileRes.json();
          if (!profileRes.ok) {
            throw new Error(result.error || 'Failed to fetch profile videos');
          }
          if (result.videos && result.videos.length > 0) {
            setProfileVideos(result.videos);
            setProfileCursor(result.cursor || '0');
            setProfileHasMore(result.hasMore || false);
          } else {
            throw new Error('No videos found for this creator or profile is private.');
          }
        } catch (err: any) {
          setProfileError(err.message || 'Something went wrong while fetching the profile.');
        } finally {
          setProfileLoading(false);
        }
        return;
      }

      setVideoData(data);

      // Save to processed list for persistent preview placeholder gallery
      setProcessedVideos((prev) => {
        const filtered = prev.filter((v) => v.id !== data.id);
        const updated = [data, ...filtered].slice(0, 30);
        localStorage.setItem('processed_tiktok_videos', JSON.stringify(updated));
        return updated;
      });

      // Save to recent searches
      setRecentSearches((prev) => {
        const updated = [targetUrl, ...prev.filter((u) => u !== targetUrl)].slice(0, 5);
        localStorage.setItem('recent_tiktok_searches', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching the video.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
          Download TikTok Videos <span className="text-pink-500">Instantly</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Free, fast, and watermark-free TikTok video downloader. Paste your link below to get started. No account required.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              mode === 'single'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Single Video</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('profile');
              setProfileError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              mode === 'profile'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/10'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Bulk</span>
          </button>
        </div>
      </div>

      {/* Input Box */}
      {mode === 'single' ? (
        <motion.form 
          onSubmit={fetchVideo}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex flex-col sm:flex-row shadow-pink-500/5 hover:border-pink-200 transition-colors"
        >
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={singleInputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste TikTok video link here..."
              className="block w-full pl-12 pr-24 py-4 text-gray-900 placeholder-gray-400 focus:outline-none rounded-xl text-lg bg-transparent"
              required
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              {showPasteTooltip === 'single' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full right-0 mb-3 z-30 w-64 bg-slate-900 text-white text-xs rounded-xl p-3.5 shadow-xl border border-slate-800 text-left leading-relaxed"
                >
                  <div className="absolute top-full right-8 -mt-1.5 w-2.5 h-2.5 bg-slate-900 rotate-45 border-r border-b border-slate-800"></div>
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-pink-400">
                    <Clipboard className="w-3.5 h-3.5" /> Direct Paste Restricted
                  </p>
                  <p className="text-gray-300">
                    Search box is focused! Simply press <kbd className="bg-slate-800 px-1 py-0.5 rounded font-mono border border-slate-700 text-white text-[10px]">Ctrl+V</kbd> (Windows) or <kbd className="bg-slate-800 px-1 py-0.5 rounded font-mono border border-slate-700 text-white text-[10px]">Cmd+V</kbd> (Mac) to paste.
                  </p>
                </motion.div>
              )}
              <button
                type="button"
                onClick={() => handlePaste('single')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-pink-50 text-gray-500 hover:text-pink-600 rounded-xl text-xs font-semibold border border-gray-100 hover:border-pink-200 transition-all duration-200 cursor-pointer"
                title="Paste link from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !url}
            className="mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 focus:ring-4 focus:ring-pink-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md flex justify-center items-center h-full cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Download'}
          </button>
        </motion.form>
      ) : (
        <motion.form 
          onSubmit={(e) => {
            e.preventDefault();
            fetchProfile(false);
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex flex-col sm:flex-row shadow-pink-500/5 hover:border-pink-200 transition-colors"
        >
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={profileInputRef}
              type="text"
              value={profileQuery}
              onChange={(e) => setProfileQuery(e.target.value)}
              placeholder="Paste creator profile link or enter @username..."
              className="block w-full pl-12 pr-24 py-4 text-gray-900 placeholder-gray-400 focus:outline-none rounded-xl text-lg bg-transparent"
              required
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              {showPasteTooltip === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full right-0 mb-3 z-30 w-64 bg-slate-900 text-white text-xs rounded-xl p-3.5 shadow-xl border border-slate-800 text-left leading-relaxed"
                >
                  <div className="absolute top-full right-8 -mt-1.5 w-2.5 h-2.5 bg-slate-900 rotate-45 border-r border-b border-slate-800"></div>
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-pink-400">
                    <Clipboard className="w-3.5 h-3.5" /> Direct Paste Restricted
                  </p>
                  <p className="text-gray-300">
                    Search box is focused! Simply press <kbd className="bg-slate-800 px-1 py-0.5 rounded font-mono border border-slate-700 text-white text-[10px]">Ctrl+V</kbd> (Windows) or <kbd className="bg-slate-800 px-1 py-0.5 rounded font-mono border border-slate-700 text-white text-[10px]">Cmd+V</kbd> (Mac) to paste.
                  </p>
                </motion.div>
              )}
              <button
                type="button"
                onClick={() => handlePaste('profile')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-pink-50 text-gray-500 hover:text-pink-600 rounded-xl text-xs font-semibold border border-gray-100 hover:border-pink-200 transition-all duration-200 cursor-pointer"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={profileLoading || !profileQuery}
            className="mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 focus:ring-4 focus:ring-pink-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md flex justify-center items-center h-full cursor-pointer min-w-[150px]"
          >
            {profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search Profile'}
          </button>
        </motion.form>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
              Recent Downloads
            </span>
            <button 
              type="button"
              onClick={() => {
                setRecentSearches([]);
                localStorage.removeItem('recent_tiktok_searches');
              }}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((searchUrl, idx) => {
              // Parse user-friendly handle and video tag
              let label = searchUrl;
              try {
                const cleanUrl = searchUrl.split('?')[0];
                const parts = cleanUrl.split('/').filter(Boolean);
                const handle = parts.find(p => p.startsWith('@'));
                const videoId = parts[parts.length - 1];
                if (handle && videoId && !isNaN(Number(videoId))) {
                  label = `${handle} (${videoId.slice(-6)})`;
                } else if (handle) {
                  label = `${handle}`;
                } else {
                  label = cleanUrl.replace(/https?:\/\/(www\.)?tiktok\.com\//, '').slice(0, 30);
                }
              } catch {
                label = searchUrl.slice(0, 30);
              }

              const isCopied = copiedUrl === searchUrl;

              return (
                <div
                  key={idx}
                  className="flex items-center bg-white rounded-full border border-gray-100 hover:border-pink-200 transition-colors shadow-sm hover:shadow-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setUrl(searchUrl);
                      fetchVideo(undefined, searchUrl);
                    }}
                    title={`Revisit search: ${searchUrl}`}
                    className="flex items-center gap-2 pl-3.5 pr-2 py-1.5 text-gray-600 hover:text-pink-600 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0"></span>
                    <span className="truncate max-w-[150px]">{label}</span>
                  </button>
                  <div className="w-px h-3.5 bg-gray-100"></div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          await navigator.clipboard.writeText(searchUrl);
                          setCopiedUrl(searchUrl);
                          setTimeout(() => setCopiedUrl(null), 2000);
                        } else {
                          // Fallback
                          const textarea = document.createElement('textarea');
                          textarea.value = searchUrl;
                          textarea.style.position = 'fixed';
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textarea);
                          setCopiedUrl(searchUrl);
                          setTimeout(() => setCopiedUrl(null), 2000);
                        }
                      } catch (err) {
                        console.error('Failed to copy', err);
                      }
                    }}
                    title="Copy TikTok link"
                    className="pl-2 pr-3.5 py-1.5 text-gray-400 hover:text-pink-500 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 max-w-2xl mx-auto bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Profile Error Message */}
      {mode === 'profile' && profileError && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 max-w-2xl mx-auto bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{profileError}</p>
        </motion.div>
      )}

      {/* Profile Results Section */}
      {mode === 'profile' && profileVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-6 md:p-8 max-w-4xl mx-auto text-left"
        >
          {/* Creator Profile Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-gray-100 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <img 
                src={profileUser?.avatarLarger || profileVideos[0].author.avatar} 
                alt={profileUser?.nickname || profileVideos[0].author.nickname} 
                className="w-16 h-16 rounded-full border-2 border-pink-500 shadow-md object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <p className="font-bold text-xl text-gray-900 flex items-center gap-1.5">
                  {profileUser?.nickname || profileVideos[0].author.nickname}
                  {(profileUser?.verified || profileVideos[0].author.verified !== false) && (
                    <CheckCircle2 className="w-5 h-5 text-pink-500 shrink-0" />
                  )}
                </p>
                <p className="text-sm text-gray-500 font-semibold">@{profileUser?.uniqueId || profileVideos[0].author.unique_id}</p>
                {profileUser?.signature && (
                  <p className="text-xs text-gray-400 mt-1 max-w-md line-clamp-2 italic">"{profileUser.signature}"</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0 w-full md:w-auto">
              <div className="bg-gradient-to-r from-pink-50 to-cyan-50 text-transparent bg-clip-text font-black text-xs px-3 py-1.5 rounded-full border border-pink-100 uppercase tracking-wider self-start md:self-auto flex items-center gap-1.5">
                <span className="text-pink-500">👤</span> <span className="text-pink-600">TikTok Creator Profile</span>
              </div>
              
              {/* Profile Statistics Block */}
              {profileStats && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 w-full md:w-auto">
                  <div className="flex flex-col text-left md:text-right min-w-[70px]">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Videos</span>
                    <span className="text-sm font-extrabold text-pink-500">{formatCount(profileStats.videoCount)}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col text-left md:text-right min-w-[70px]">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Followers</span>
                    <span className="text-sm font-extrabold text-gray-900">{formatCount(profileStats.followerCount)}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                  <div className="flex flex-col text-left md:text-right min-w-[70px]">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Likes</span>
                    <span className="text-sm font-extrabold text-gray-900">{formatCount(profileStats.heartCount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-6 text-left">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2.5 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVideos.length === profileVideos.length) {
                      setSelectedVideos([]);
                    } else {
                      setSelectedVideos(profileVideos.map(v => v.id));
                    }
                  }}
                  className="text-xs font-semibold px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-all shadow-sm cursor-pointer"
                >
                  {selectedVideos.length === profileVideos.length ? "Deselect All" : "Select All Videos"}
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  {selectedVideos.length} of {profileVideos.length} selected
                  {profileStats && (
                    <span className="text-gray-400"> (Loaded {profileVideos.length} of {formatCount(profileStats.videoCount)} total videos)</span>
                  )}
                </span>
              </div>

              {/* Batch Download Format Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Save Format:</span>
                <button
                  type="button"
                  onClick={() => setBulkDownloadMode('zip')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    bulkDownloadMode === 'zip'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📦 Packaging ZIP (Perfect for Mobile)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDownloadMode('individual')}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    bulkDownloadMode === 'individual'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📁 Separate MP4 Files
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={selectedVideos.length === 0 || bulkDownloading}
              onClick={handleBulkDownloadSelected}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 disabled:from-gray-300 disabled:to-gray-400 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {bulkDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading {bulkProgress} / {selectedVideos.length}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Selected ({selectedVideos.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Bulk Download Progress Overlay */}
          {bulkDownloading && !isDownloadingAllAsZip && (
            <div className="mb-6 bg-pink-50/70 rounded-2xl p-5 border border-pink-100 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-pink-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />
                  <span>{zipStatusMessage || 'Downloading TikTok Videos in Bulk...'}</span>
                </span>
                <span>{Math.round((bulkProgress / selectedVideos.length) * 100)}%</span>
              </div>
              <div className="w-full bg-pink-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300"
                  style={{ width: `${(bulkProgress / selectedVideos.length) * 100}%` }}
                ></div>
              </div>

              {zipPackagingPercent !== null && (
                <div className="bg-white/80 rounded-xl p-3 border border-pink-100 text-left mt-1">
                  <div className="flex justify-between text-[11px] font-bold text-pink-700 mb-1">
                    <span>Zipping Progress (Packing items into single ZIP)</span>
                    <span>{zipPackagingPercent}%</span>
                  </div>
                  <div className="w-full bg-pink-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-pink-600 h-full transition-all duration-300"
                      style={{ width: `${zipPackagingPercent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-pink-600 mt-1 font-medium text-left">
                Please keep this tab open. Videos are being processed sequentially to bypass browser connection limits.
              </p>
            </div>
          )}

          {/* Highlight total count announcement */}
          {profileStats && (
            <div className="mb-6 bg-gradient-to-r from-pink-50 to-cyan-50 border border-pink-100 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 shrink-0">
                  <Video className="w-6 h-6 animate-pulse text-pink-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">Profile Upload Status</h4>
                  <p className="text-sm text-gray-800 mt-0.5">
                    এই প্রোফাইলে মোট <span className="font-extrabold text-pink-600 underline decoration-pink-300 decoration-2">{profileStats.videoCount.toLocaleString()} টি</span> ভিডিও আপলোড করা আছে।
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    ({profileVideos.length} টি ভিডিও বর্তমানে লিস্টে লোড করা হয়েছে)
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  disabled={isDownloadingAllAsZip || bulkDownloading || profileLoading}
                  onClick={handleDownloadAllProfileVideosAsZip}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 disabled:from-gray-300 disabled:to-gray-400 hover:opacity-95 text-white text-xs font-extrabold rounded-xl shadow-lg hover:shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDownloadingAllAsZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>সব ভিডিও ডাউনলোড হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 animate-bounce" />
                      <span>সব ভিডিও একসাথে জিপ করুন (ZIP ALL)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Dedicated Download All ZIP Status & Progress Panel */}
          {(isDownloadingAllAsZip || completedZipData) && (
            <div className={`mb-6 rounded-3xl p-6 shadow-2xl border flex flex-col gap-4 text-left animate-fade-in ${completedZipData ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-r from-slate-900 to-gray-900 text-white border-gray-800'}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${completedZipData ? 'border-emerald-200' : 'border-gray-800'}`}>
                <div className="flex items-center gap-2.5">
                  {!completedZipData && <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-ping" />}
                  {completedZipData && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  <span className={`text-xs font-black uppercase tracking-widest ${completedZipData ? 'text-emerald-700' : 'text-pink-400'}`}>
                    {completedZipData ? 'ZIP Ready for Download' : 'Auto-Fetch & Bulk Zip Mode'}
                  </span>
                </div>
                {!completedZipData && <span className="text-[10px] font-mono bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-md font-bold">ACTIVE</span>}
              </div>

              {!completedZipData && (
                <>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      <span>{downloadAllProgressMessage || "কাজ শুরু করা হচ্ছে..."}</span>
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      এটি একটি সম্পূর্ণ স্বয়ংক্রিয় প্রসেস। আপনার ডিভাইসে বার বার পারমিশন পপআপ যাতে না আসে, সেজন্য সব ভিডিওকে প্রথমে ব্রাউজারে একটি একক জিপ (ZIP) ফাইলে সংরক্ষণ করা হচ্ছে। দয়া করে ট্যাবটি বন্ধ করবেন না।
                    </p>
                  </div>

                  {/* Progress visualizer */}
                  {profileStats && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] text-gray-300 font-bold">
                        <span>সংগৃহীত ও প্যাক করা ভিডিও:</span>
                        <span className="font-mono text-pink-400">{bulkProgress} / {profileStats.videoCount}</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round((bulkProgress / Math.max(1, profileStats.videoCount)) * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {completedZipData && (
                <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <Download className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1">জিপ ফাইল প্রস্তুত!</h4>
                    <p className="text-sm text-gray-600">আপনার সব ভিডিও একসাথে সফলভাবে জিপ করা হয়েছে। নিচের বাটনে ক্লিক করে সেভ করুন।</p>
                  </div>
                  <a
                    href={completedZipData.url}
                    download={completedZipData.filename}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 mt-2"
                    onClick={() => {
                       // Optional: Hide the panel after they click it. Or keep it.
                    }}
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>Save ZIP File to Device</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Creator Videos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
            {profileVideos.map((video, idx) => {
              const isSelected = selectedVideos.includes(video.id);
              return (
                <div 
                  key={video.id || idx}
                  className={`group relative bg-white rounded-2xl overflow-hidden border transition-all flex flex-col ${
                    isSelected ? "border-pink-500 ring-2 ring-pink-500/20" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {/* Aspect Box */}
                  <div className="relative aspect-[3/4] w-full bg-gray-100 overflow-hidden">
                    <img 
                      src={video.cover} 
                      alt={video.title || "TikTok video"} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 animate-fade-in"
                      referrerPolicy="no-referrer"
                    />

                    {/* Selection Checkbox Trigger Overlay */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedVideos(prev => prev.filter(id => id !== video.id));
                        } else {
                          setSelectedVideos(prev => [...prev, video.id]);
                        }
                      }}
                      className="absolute inset-0 bg-transparent cursor-pointer"
                    />

                    {/* Live Download Queue Status Overlay */}
                    {downloadStatus[video.id] && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center z-20 animate-fade-in text-white pointer-events-none">
                        {downloadStatus[video.id] === 'pending' && (
                          <div className="flex flex-col items-center gap-1.5">
                            <Clock className="w-5 h-5 text-gray-400 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pending...</span>
                          </div>
                        )}
                        {downloadStatus[video.id] === 'downloading' && (
                          <div className="flex flex-col items-center gap-2 w-full px-4">
                            <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Downloading</span>
                            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-pink-500 h-full transition-all" style={{ width: `${downloadProgress[video.id] || 0}%` }}></div>
                            </div>
                            <span className="text-[10px] font-mono font-bold mt-0.5">{downloadProgress[video.id] || 0}%</span>
                          </div>
                        )}
                        {downloadStatus[video.id] === 'retrying' && (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Retrying...</span>
                          </div>
                        )}
                        {downloadStatus[video.id] === 'completed' && (
                          <div className="flex flex-col items-center gap-1.5">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Done</span>
                          </div>
                        )}
                        {downloadStatus[video.id] === 'failed' && (
                          <div className="flex flex-col items-center gap-1.5">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Failed</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Checkbox Corner Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedVideos(prev => prev.filter(id => id !== video.id));
                        } else {
                          setSelectedVideos(prev => [...prev, video.id]);
                        }
                      }}
                      className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer transition-colors animate-fade-in"
                    >
                      <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-all ${
                        isSelected ? "bg-pink-500 text-white" : "border-2 border-white"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Hover Overlay containing quick individual Download */}
                    {!downloadStatus[video.id] && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
                            const filename = `tiktok_hd_${video.id}${cleanTitle ? '_' + cleanTitle : ''}.mp4`;
                            downloadSingleVideoWithProgress(video.hdplay || video.play, filename, video.id);
                          }}
                          className="px-4 py-2.5 bg-white text-gray-900 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-1.5 pointer-events-auto cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-pink-500" />
                          Download Video
                        </button>
                      </div>
                    )}

                    {/* Duration Badge */}
                    {video.duration && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-white/10">
                        {video.duration}s
                      </div>
                    )}
                  </div>

                  {/* Caption & Footer */}
                  <div className="p-3 bg-white flex flex-col flex-grow justify-between gap-2.5 text-left">
                    <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-relaxed">
                      {video.title || "No description"}
                    </p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-2 mt-auto">
                      <span className="text-[10px] font-mono text-gray-400">
                        {video.create_time ? new Date(video.create_time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
                          const filename = `tiktok_hd_${video.id}${cleanTitle ? '_' + cleanTitle : ''}.mp4`;
                          downloadSingleVideoWithProgress(video.hdplay || video.play, filename, video.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-pink-500 bg-gray-50 hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
                        title="Download Video (HD)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button & Auto-loader for 500 Videos */}
          {profileHasMore && (
            <div className="flex flex-col items-center gap-4 mt-12 border-t border-gray-100 pt-8 w-full px-4">
              {loadingTargetCount && (
                <div className="w-full max-w-md bg-pink-50 rounded-2xl p-4 border border-pink-100 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-pink-700 font-semibold mb-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                    <span>Auto-Fetching Creator Library...</span>
                  </div>
                  <div className="text-xs text-pink-600 font-medium">
                    Loaded <span className="font-bold">{profileVideos.length}</span> of up to <span className="font-bold">{loadingTargetCount}</span> videos
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-lg">
                <button
                  type="button"
                  disabled={profileLoading}
                  onClick={() => fetchProfile(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 hover:bg-gray-100 hover:text-pink-600 text-gray-600 font-semibold rounded-2xl border border-gray-200 shadow-sm transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-1"
                >
                  {profileLoading && !loadingTargetCount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      <span>Loading Next Page...</span>
                    </>
                  ) : (
                    <>
                      <Grid className="w-4 h-4 text-pink-500" />
                      <span>Load Next Batch</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={profileLoading}
                  onClick={() => fetchProfileUntilTarget(500)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold rounded-2xl shadow-md hover:opacity-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-1"
                >
                  {profileLoading && loadingTargetCount === 500 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching (Loaded {profileVideos.length})...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Auto-Load to 500 Videos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Processed Videos Gallery / Placeholder area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-12 max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-4 px-1 text-left">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-pink-500" />
              <span>Processed Video Library</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Your recently analyzed TikTok videos. Download high quality without watermark instantly.
            </p>
          </div>
          {processedVideos.length > 0 && (
            <button
              onClick={() => {
                setProcessedVideos([]);
                localStorage.removeItem('processed_tiktok_videos');
              }}
              className="text-xs font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {processedVideos.length === 0 ? (
          /* Elegant Placeholder Area */
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center bg-gray-50/50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-4 text-pink-500 shadow-sm border border-pink-100">
              <Video className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-700">No processed videos yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Once you process a valid TikTok URL using the downloader, the video thumbnail, title, and high quality MP4 links will appear here.
            </p>
          </div>
        ) : (
          /* Processed Videos Carousel/Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {processedVideos.map((video) => (
              <div 
                key={video.id} 
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-all group"
              >
                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                  <img 
                    src={video.cover} 
                    alt={video.title || "TikTok cover"} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Live Download Queue Status Overlay */}
                  {downloadStatus[video.id] && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center z-20 animate-fade-in text-white pointer-events-none">
                      {downloadStatus[video.id] === 'pending' && (
                        <div className="flex flex-col items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Pending...</span>
                        </div>
                      )}
                      {downloadStatus[video.id] === 'downloading' && (
                        <div className="flex flex-col items-center gap-1.5 w-full px-2">
                          <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-0.5">
                            <div className="bg-pink-500 h-full transition-all" style={{ width: `${downloadProgress[video.id] || 0}%` }}></div>
                          </div>
                          <span className="text-[9px] font-mono font-bold">{downloadProgress[video.id] || 0}%</span>
                        </div>
                      )}
                      {downloadStatus[video.id] === 'completed' && (
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-green-400">Done</span>
                        </div>
                      )}
                      {downloadStatus[video.id] === 'failed' && (
                        <div className="flex flex-col items-center gap-1">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Failed</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setVideoData(video)}
                      className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold text-gray-900 shadow hover:bg-gray-100 transition-all cursor-pointer"
                      title="Preview details"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
                <div className="p-3 text-left flex flex-col justify-between flex-grow gap-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-relaxed">
                    {video.title || "No Title"}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <span className="text-[10px] font-mono text-gray-400">@{video.author.unique_id}</span>
                    <button
                      onClick={() => {
                        const cleanTitle = (video.title || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 30);
                        const filename = `tiktok_hd_${video.id}${cleanTitle ? '_' + cleanTitle : ''}.mp4`;
                        downloadSingleVideoWithProgress(video.hdplay || video.play, filename, video.id);
                      }}
                      className="p-1.5 text-pink-500 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors cursor-pointer"
                      title="Download HQ Video"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Result Section */}
      {videoData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden max-w-4xl mx-auto"
        >
          {videoData.images && videoData.images.length > 0 ? (
            /* Slideshow / Photo Gallery Layout */
            <div className="p-6 md:p-8">
              {/* Header Details */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-3">
                  <img src={videoData.author.avatar} alt={videoData.author.nickname} className="w-12 h-12 rounded-full border border-gray-200 shadow-sm" />
                  <div>
                    <p className="font-bold text-gray-900">{videoData.author.nickname}</p>
                    <p className="text-sm text-gray-500">@{videoData.author.unique_id}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-pink-50 text-pink-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-pink-100 uppercase tracking-wider">
                    📸 Photo Slideshow
                  </span>
                  <span className="bg-cyan-50 text-cyan-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-100 uppercase tracking-wider">
                    {videoData.images.length} Photos
                  </span>
                </div>
              </div>

              {/* Title & Caption */}
              <h3 className="text-xl font-semibold text-gray-800 mb-6 leading-snug">
                {videoData.title || 'No Title'}
              </h3>

              {/* Batch Actions and Music download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={async () => {
                    if (!videoData.images) return;
                    for (let i = 0; i < videoData.images.length; i++) {
                      const imgUrl = videoData.images[i];
                      const filename = `tiktok_photo_${videoData.id}_${i + 1}.jpg`;
                      const downloadUrl = `/api/download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(filename)}`;
                      
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      // Micro-sleep to avoid being blocked by browsers
                      await new Promise((resolve) => setTimeout(resolve, 300));
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-2xl hover:opacity-95 shadow-md transition-all text-sm"
                >
                  <Download className="w-5 h-5" />
                  <span>Download All Photos ({videoData.images.length})</span>
                </button>

                <a 
                  href={`/api/download?url=${encodeURIComponent(videoData.music)}&filename=${encodeURIComponent(`tiktok_audio_${videoData.id}.mp3`)}`}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-2xl border border-gray-200 shadow-sm transition-all text-sm"
                >
                  <Music className="w-5 h-5 text-pink-500" />
                  <span>Download Slideshow Audio (MP3)</span>
                </a>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {videoData.images.map((imgUrl, index) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    key={index}
                    className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
                      <img 
                        src={imgUrl} 
                        alt={`Slideshow item ${index + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {/* Image Number Badge */}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/10">
                        #{index + 1}
                      </div>
                      {/* Overlay Action */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <a
                          href={`/api/download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(`tiktok_photo_${videoData.id}_${index + 1}.jpg`)}`}
                          className="px-4 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-xs hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Original
                        </a>
                      </div>
                    </div>
                    
                    {/* Explicitly visible download button and footer */}
                    <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
                      <span className="text-xs font-semibold text-gray-500">Photo {index + 1}</span>
                      <a
                        href={`/api/download?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(`tiktok_photo_${videoData.id}_${index + 1}.jpg`)}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JPG</span>
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Traditional Single Video Layout */
            <div className="flex flex-col md:flex-row">
              {/* Visuals */}
              <div className="md:w-1/3 relative bg-gray-50">
                <img 
                  src={videoData.cover} 
                  alt={videoData.title} 
                  className="w-full h-full object-cover max-h-80 md:max-h-full"
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded border border-white/10 font-mono">
                  {videoData.duration}s
                </div>
              </div>

              {/* Details & Actions */}
              <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={videoData.author.avatar} alt={videoData.author.nickname} className="w-10 h-10 rounded-full border border-gray-200" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{videoData.author.nickname}</p>
                      <p className="text-xs text-gray-500">@{videoData.author.unique_id}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 line-clamp-3 leading-snug mb-6">
                    {videoData.title || 'No title'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <a 
                    href={`/api/download?url=${encodeURIComponent(videoData.hdplay || videoData.play)}&filename=${encodeURIComponent(`tiktok_video_hd_${videoData.id}.mp4`)}`}
                    className="w-full flex items-center justify-between px-4 py-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-medium rounded-xl border border-cyan-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-cyan-600" />
                      <span>Download MP4 (HD)</span>
                    </div>
                    <span className="text-xs bg-cyan-200 text-cyan-800 px-2 py-0.5 rounded uppercase tracking-wider font-bold">No Watermark</span>
                  </a>

                  <a 
                    href={`/api/download?url=${encodeURIComponent(videoData.wmplay)}&filename=${encodeURIComponent(`tiktok_video_sd_${videoData.id}.mp4`)}`}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-gray-500" />
                      <span>Download MP4 (SD)</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Watermarked</span>
                  </a>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <a 
                      href={`/api/download?url=${encodeURIComponent(videoData.music)}&filename=${encodeURIComponent(`tiktok_audio_${videoData.id}.mp3`)}`}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors text-sm"
                    >
                      <Music className="w-4 h-4" />
                      <span>Audio MP3</span>
                    </a>
                    <a 
                      href={`/api/download?url=${encodeURIComponent(videoData.cover)}&filename=${encodeURIComponent(`tiktok_thumbnail_${videoData.id}.jpg`)}`}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors text-sm"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Thumbnail</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Premium Upcall */}
      {!videoData && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-sm font-medium border border-pink-100 mb-6">
            <Star className="w-4 h-4" /> Go Premium
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { title: 'No Ads', desc: 'Enjoy a completely ad-free experience.' },
              { title: 'Faster Queue', desc: 'Prioritized download lane for premium members.' },
              { title: 'Batch Downloads', desc: 'Download entire TikTok profiles at once.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left flex flex-col gap-2">
                <CheckCircle2 className="w-6 h-6 text-pink-500" />
                <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
