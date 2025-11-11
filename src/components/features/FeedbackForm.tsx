import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/services/api/client';

interface FeedbackFormProps {
  userId: string;
  recommendationId: string;
  onSubmitted?: () => void;
}

export function FeedbackForm({ userId, recommendationId, onSubmitted }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [accuracyRating, setAccuracyRating] = useState<number>(0);
  const [clarityRating, setClarityRating] = useState<number>(0);
  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.createFeedback({
        userId,
        recommendationId,
        rating,
        accuracyRating: accuracyRating || undefined,
        clarityRating: clarityRating || undefined,
        overallSatisfaction: overallSatisfaction || undefined,
        comments: comments || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSubmitted) {
          onSubmitted();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl ${star <= value ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-300 transition-colors`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  if (success) {
    return (
      <Alert>
        <AlertDescription>
          <p className="font-semibold">✓ Thank you for your feedback!</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate This Recommendation</CardTitle>
        <CardDescription>
          Help us improve by sharing your feedback
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating value={rating} onChange={setRating} label="Overall Rating *" />
          <StarRating value={accuracyRating} onChange={setAccuracyRating} label="Accuracy Rating" />
          <StarRating value={clarityRating} onChange={setClarityRating} label="Clarity Rating" />
          <StarRating value={overallSatisfaction} onChange={setOverallSatisfaction} label="Overall Satisfaction" />

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Input
              id="comments"
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share your thoughts..."
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting || rating === 0}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

