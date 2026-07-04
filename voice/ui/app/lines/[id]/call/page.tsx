'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  useToast,
} from 'design-system';
import type { EndCallResult, EscalateResult, Sentiment } from '@/lib/api';

const NAV = [{ label: 'Lines', href: '/', active: true }];

interface TurnLog {
  id: number;
  speaker: 'caller' | 'agent';
  text: string;
  sentiment?: Sentiment;
}

export default function CallConsolePage({ params }: { params: { id: string } }) {
  const { showToast } = useToast();
  const [callId, setCallId] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [turns, setTurns] = useState<TurnLog[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalationRecommended, setEscalationRecommended] = useState(false);
  const [sentimentTrend, setSentimentTrend] = useState<number[]>([]);
  const [ended, setEnded] = useState<EndCallResult | null>(null);
  const [escalation, setEscalation] = useState<EscalateResult | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cardLast4, setCardLast4] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const nextTurnId = useRef(0);

  useEffect(() => {
    async function start() {
      const res = await fetch(`/api/lines/${params.id}/calls`, { method: 'POST' });
      if (!res.ok) {
        showToast({ message: 'Failed to start call', variant: 'error' });
        setStarting(false);
        return;
      }
      const data = await res.json();
      setCallId(data.call_id);
      setStarting(false);
    }
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function sendTurn() {
    if (!callId || !input.trim()) return;
    const text = input;
    setInput('');
    setTurns((prev) => [...prev, { id: nextTurnId.current++, speaker: 'caller', text }]);
    setSending(true);
    try {
      const res = await fetch(`/api/calls/${callId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId: params.id, text }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Turn failed');
      }
      const result = await res.json();
      setTurns((prev) => [
        ...prev,
        { id: nextTurnId.current++, speaker: 'agent', text: result.reply, sentiment: result.sentiment },
      ]);
      setEscalationRecommended(result.escalation_recommended);
      setSentimentTrend(result.call_sentiment_trend);
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    } finally {
      setSending(false);
    }
  }

  async function handleEscalate() {
    if (!callId) return;
    const res = await fetch(`/api/calls/${callId}/escalate`, { method: 'POST' });
    if (!res.ok) {
      showToast({ message: 'Failed to escalate call', variant: 'error' });
      return;
    }
    const result: EscalateResult = await res.json();
    setEscalation(result);
    showToast({ message: 'Call escalated', variant: 'success' });
  }

  async function handleEndCall() {
    if (!callId) return;
    const res = await fetch(`/api/calls/${callId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineId: params.id }),
    });
    if (!res.ok) {
      showToast({ message: 'Failed to end call', variant: 'error' });
      return;
    }
    const result: EndCallResult = await res.json();
    setEnded(result);
    showToast({ message: 'Call ended', variant: 'success' });
  }

  async function handlePayment() {
    if (!callId) return;
    try {
      const res = await fetch(`/api/calls/${callId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masked_card_last4: cardLast4,
          amount: parseFloat(amount),
          currency,
        }),
      });
      const result = await res.json();
      if (result.status === 'blocked') {
        showToast({ message: 'Payment blocked by guardrail', variant: 'error' });
      } else {
        showToast({ message: 'Payment collected', variant: 'success' });
      }
      setPaymentModalOpen(false);
      setCardLast4('');
      setAmount('');
    } catch (err) {
      showToast({ message: (err as Error).message, variant: 'error' });
    }
  }

  const latestTrendPoint = sentimentTrend[sentimentTrend.length - 1];

  return (
    <AppShell
      productName="Voice"
      nav={NAV}
      title="Call console"
      actions={
        !ended && callId
          ? (
            <>
              <Button variant="secondary" onClick={() => setPaymentModalOpen(true)}>
                Collect payment
              </Button>
              <Button variant="secondary" onClick={handleEscalate}>
                Escalate
              </Button>
              <Button variant="destructive" onClick={handleEndCall}>
                End call
              </Button>
            </>
          )
          : undefined
      }
    >
      {starting ? (
        <p className="text-sm text-text-muted">Starting call…</p>
      ) : !callId ? (
        <p className="text-sm text-status-error">Could not start a call on this line.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {escalationRecommended && (
            <Badge status="warning">Escalation recommended — sentiment trending negative</Badge>
          )}
          {typeof latestTrendPoint === 'number' && (
            <p className="text-xs text-text-muted">
              Latest sentiment score: {latestTrendPoint.toFixed(2)}
            </p>
          )}

          {escalation && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Escalation summary</h3>
              <p className="text-sm text-text-primary">{escalation.summary}</p>
            </Card>
          )}

          {ended && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Call ended</h3>
              <p className="text-sm text-text-primary">
                Average sentiment: {ended.average_sentiment.toFixed(2)} — trend: {ended.trend}
              </p>
            </Card>
          )}

          <Card>
            <div className="flex flex-col gap-3">
              {turns.length === 0 && (
                <p className="text-sm text-text-muted">Send the first message to begin.</p>
              )}
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={
                    turn.speaker === 'caller'
                      ? 'ml-auto max-w-md rounded-lg bg-brand-primary/10 px-3 py-2 text-sm text-text-primary'
                      : 'mr-auto max-w-md rounded-lg bg-bg-base px-3 py-2 text-sm text-text-primary'
                  }
                >
                  <p>{turn.text}</p>
                  {turn.sentiment && (
                    <span className="mt-1 block text-xs text-text-muted">
                      sentiment: {turn.sentiment.label} ({turn.sentiment.score.toFixed(2)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {!ended && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Message"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTurn()}
                />
              </div>
              <Button onClick={sendTurn} disabled={sending || !input.trim()}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Collect payment"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Card last 4 digits"
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value)}
            maxLength={4}
          />
          <Input label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Button onClick={handlePayment} disabled={!cardLast4 || !amount}>
            Submit
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
