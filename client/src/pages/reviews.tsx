import React from 'react';
import { Button } from '@/components/ui/button';

export default function ReviewsPage() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';

  const overrideUrl = (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL as string | undefined;
  const placeId = (import.meta as any).env?.VITE_GOOGLE_PLACE_ID as string | undefined;
  const [serverReviewUrl, setServerReviewUrl] = React.useState<string | null>(null);
  const [configLoading, setConfigLoading] = React.useState<boolean>(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Allow passing reviewUrl via query param as immediate override
  React.useEffect(() => {
    const qpUrl = params.get('reviewUrl') || params.get('ru');
    if (qpUrl) {
      try {
        setServerReviewUrl(decodeURIComponent(qpUrl));
      } catch {
        setServerReviewUrl(qpUrl);
      }
    }
  }, []);

  // Fallback to server-provided config if client env is not set
  React.useEffect(() => {
    if (!overrideUrl && !placeId) {
      setConfigLoading(true);
      fetch('/api/reviews/config')
        .then(async (r) => {
          try {
            const j = await r.json();
            setServerReviewUrl(j?.reviewUrl || null);
          } catch {
            setServerReviewUrl(null);
          }
        })
        .catch(() => setServerReviewUrl(null))
        .finally(() => setConfigLoading(false));
    }
  }, [overrideUrl, placeId]);

  const reviewUrl = overrideUrl
    ? overrideUrl
    : placeId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
    : serverReviewUrl || undefined;

  const handleOpenReview = async () => {
    if (reviewUrl) {
      window.open(reviewUrl, '_blank');
      return;
    }
    // Try fetching server config on-demand before giving up
    try {
      setConfigLoading(true);
      const r = await fetch('/api/reviews/config');
      const j = await r.json();
      if (j?.reviewUrl) {
        setServerReviewUrl(j.reviewUrl);
        window.open(j.reviewUrl, '_blank');
        return;
      }
    } catch {}
    finally { setConfigLoading(false); }
    alert('Review link not configured. Please contact admin.');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!token) throw new Error('Missing token in URL. Please use the link provided.');
      const note = 'User confirmed review from reviews page';
      const res = await fetch('/api/reviews/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to confirm review');
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rosae-black text-white p-6">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-800 text-center space-y-4">
        {/* Header */}
        <h1 className="text-2xl font-semibold tracking-tight">Share your experience</h1>
        <p className="text-sm text-gray-400">Please review us on Google.</p>

        {!token && (
          <div className="text-red-300 text-sm">Invalid link: missing token. Please use the exact link shared by our staff.</div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button
            variant="secondary"
            onClick={handleOpenReview}
            className="w-full justify-center"
            disabled={configLoading}
          >
            {configLoading ? 'Loading…' : 'Open Google Reviews'}
          </Button>
          <div className="text-xs text-gray-400">Your review will help us to improve</div>

          <Button
            onClick={handleConfirm}
            disabled={submitting || !token || done}
            className="w-full justify-center"
          >
            {submitting ? 'Submitting…' : done ? 'Submitted' : 'Review Submitted'}
          </Button>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {done && <div className="text-green-400 text-sm">Thank you! Your review has been recorded.</div>}
        </div>
      </div>
    </div>
  );
}