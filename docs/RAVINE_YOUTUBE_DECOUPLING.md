# RAVINE independent media playback

YouTube URLs are treated as reference sources only. They must never be used as the playback source for the RAVINE player or hover previews.

RAVINE playback requires media hosted in the private Supabase `videos` bucket and accessed through the internal `/api/media/video/[id]` endpoint.

External video URLs remain non-playable until an independent RAVINE-hosted media asset exists.
