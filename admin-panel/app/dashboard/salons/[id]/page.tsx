'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dashboardApi } from '@/lib/api';
import {
  Store, Phone, Mail, MapPin, Clock, User, CheckCircle, XCircle,
  PauseCircle, ArrowLeft, Scissors, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface WorkingHour {
  day: number | string;
  isClosed?: boolean;
  openTime?: string;
  closeTime?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayIndex = (d: number | string): number =>
  typeof d === 'number' ? d : DAY_FULL.indexOf(d as string);

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
}

interface SalonDetail {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  hasPendingChanges?: boolean;
  rejectionReason?: string;
  suspendReason?: string;
  category: string;
  address: { street: string; city: string; state: string; pincode?: string; country?: string };
  ownerId: { _id: string; firstName: string; lastName: string; email: string; phone: string };
  workingHours?: WorkingHour[];
  services?: Service[];
  images?: string[];
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

type ModalType = 'approve' | 'reject' | 'suspend' | null;

function Modal({
  type, onClose, onConfirm,
}: {
  type: ModalType;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!type) return null;

  const config = {
    approve: {
      title: 'Approve Salon',
      desc: 'This salon will go live and become visible to customers.',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      btnClass: 'btn-success',
      btnLabel: 'Approve',
      needsReason: false,
    },
    reject: {
      title: 'Reject Salon',
      desc: 'The salon owner will be notified with the reason.',
      icon: XCircle,
      iconColor: 'text-red-500',
      btnClass: 'btn-danger',
      btnLabel: 'Reject',
      needsReason: true,
    },
    suspend: {
      title: 'Suspend Salon',
      desc: 'The salon will be hidden from customers temporarily.',
      icon: PauseCircle,
      iconColor: 'text-yellow-500',
      btnClass: 'bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
      btnLabel: 'Suspend',
      needsReason: true,
    },
  }[type];

  const Icon = config.icon;

  const handleConfirm = async () => {
    if (config.needsReason && !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(reason.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">{config.title}</h3>
              <p className="text-sm text-slate-500">{config.desc}</p>
            </div>
          </div>

          {config.needsReason && (
            <textarea
              placeholder={`Reason for ${type}…`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="input resize-none mt-2"
              autoFocus
            />
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={handleConfirm} className={config.btnClass} disabled={loading}>
            {loading ? 'Processing…' : config.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [salon, setSalon] = useState<SalonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);

  const load = async () => {
    try {
      const res = await dashboardApi.getSalonById(id);
      setSalon(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAction = async (reason?: string) => {
    if (!salon || !modal) return;
    try {
      if (modal === 'approve') await dashboardApi.approveSalon(id);
      else if (modal === 'reject') await dashboardApi.rejectSalon(id, reason!);
      else if (modal === 'suspend') await dashboardApi.suspendSalon(id, reason!);

      toast.success(`Salon ${modal}d successfully`);
      setModal(null);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || `Failed to ${modal} salon`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="card p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-400">Salon not found.</p>
      </div>
    );
  }

  const sortedHours = salon.workingHours
    ? [...salon.workingHours].sort((a, b) => dayIndex(a.day) - dayIndex(b.day))
    : [];

  return (
    <>
      <Modal type={modal} onClose={() => setModal(null)} onConfirm={handleAction} />

      <div className="space-y-5">
        {/* Back + Title */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{salon.name}</h2>
              <p className="text-sm text-slate-400">
                Registered {format(new Date(salon.createdAt), 'PPP')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {salon.status !== 'approved' && (
              <button onClick={() => setModal('approve')} className="btn-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {salon.status === 'pending' && (
              <button onClick={() => setModal('reject')} className="btn-danger flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            )}
            {salon.status === 'approved' && (
              <button
                onClick={() => setModal('suspend')}
                className="bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <PauseCircle className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        </div>

        {/* Pending changes banner */}
        {salon.hasPendingChanges && (
          <div className="p-4 rounded-xl text-sm bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-between">
            <div>
              <strong>Owner updated this salon.</strong> Review the info below and mark reviewed when done.
            </div>
            <button
              onClick={async () => {
                await dashboardApi.markSalonReviewed(id);
                load();
              }}
              className="ml-4 px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">
              Mark reviewed
            </button>
          </div>
        )}

        {/* Status banner */}
        {(salon.rejectionReason || salon.suspendReason) && (
          <div className={`p-4 rounded-xl text-sm ${
            salon.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <strong>{salon.status === 'rejected' ? 'Rejection' : 'Suspension'} reason:</strong>{' '}
            {salon.rejectionReason ?? salon.suspendReason}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Salon Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic Info */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Salon Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Name" value={salon.name} />
                <InfoRow label="Category" value={salon.category} />
                <InfoRow label="Phone" value={salon.phone} />
                <InfoRow label="Email" value={salon.email} />
                {salon.rating !== undefined && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Rating</p>
                    <p className="text-sm text-slate-700 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {Number(salon.rating).toFixed(1)} ({salon.reviewCount ?? 0} reviews)
                    </p>
                  </div>
                )}
              </div>
              {salon.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{salon.description}</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Address</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Street" value={salon.address?.street} />
                <InfoRow label="City" value={salon.address?.city} />
                <InfoRow label="State" value={salon.address?.state} />
                <InfoRow label="Pincode" value={salon.address?.pincode} />
                <InfoRow label="Country" value={salon.address?.country} />
              </div>
            </div>

            {/* Services */}
            {salon.services && salon.services.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Scissors className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">Services ({salon.services.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {salon.services.map((svc) => (
                    <div key={svc._id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">{svc.name}</p>
                        <p className="text-xs text-slate-400">{svc.category} • {svc.duration} min</p>
                      </div>
                      <span className="font-semibold text-slate-800">₹{svc.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Owner + Hours */}
          <div className="space-y-5">
            {/* Owner Info */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Owner</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {salon.ownerId?.firstName?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">
                      {salon.ownerId?.firstName} {salon.ownerId?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">Salon Owner</p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <a href={`mailto:${salon.ownerId?.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary transition-colors">
                    <Mail className="w-3.5 h-3.5" /> {salon.ownerId?.email}
                  </a>
                  <a href={`tel:${salon.ownerId?.phone}`} className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {salon.ownerId?.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            {sortedHours.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-700 text-sm">Working Hours</h3>
                </div>
                <div className="space-y-2">
                  {sortedHours.map((wh) => (
                    <div key={String(wh.day)} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 w-12">
                        {typeof wh.day === 'number' ? DAY_NAMES[wh.day] : String(wh.day).slice(0, 3)}
                      </span>
                      {!wh.isClosed ? (
                        <span className="text-slate-700 font-medium">{wh.openTime} – {wh.closeTime}</span>
                      ) : (
                        <span className="text-slate-300">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images preview */}
            {salon.images && salon.images.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 text-sm mb-3">Photos ({salon.images.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {salon.images.slice(0, 4).map((img, i) => {
                    const url = typeof img === 'string' ? img : (img && (img as any).url ? (img as any).url : '');
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Salon photo ${i + 1}`}
                          className="w-full h-20 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
