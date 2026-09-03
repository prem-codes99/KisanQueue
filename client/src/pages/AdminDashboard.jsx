import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import io from 'socket.io-client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Building, Users, Ticket, CheckSquare, 
  IndianRupee, Activity, Plus, Search, Filter,
  AlertCircle, AlertTriangle, CheckCircle2, ChevronRight,
  Clock, ShieldAlert, Check, X, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import BottleneckDetailModal from '../components/BottleneckDetailModal.jsx';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatChartDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]} ${year}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

const DailyTrendCustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const data = item.payload || {};
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-gray-100 text-left min-w-[175px] ring-1 ring-black/5">
        <div className="flex items-center space-x-1.5 mb-2 pb-2 border-b border-gray-100">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
          <p className="text-2xs font-extrabold text-gray-800">
            {formatFullDate(data.date || label)}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-3">
            <span className="text-3xs font-semibold text-gray-500">Procured Volume:</span>
            <span className="text-xs font-black text-emerald-600">
              {data.volume != null ? Number(data.volume).toLocaleString() : 0} Qtl
            </span>
          </div>
          {data.earnings != null && Number(data.earnings) > 0 && (
            <div className="flex justify-between items-center gap-3 pt-1.5 border-t border-gray-100/70">
              <span className="text-3xs font-semibold text-gray-500">Payout Value:</span>
              <span className="text-2xs font-bold text-gray-800">
                ₹{Number(data.earnings).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddCentreModal, setShowAddCentreModal] = useState(false);

  // Bottleneck Monitor States
  const [bottlenecks, setBottlenecks] = useState([]);
  const [bottlenecksLoading, setBottlenecksLoading] = useState(true);
  const [selectedBottleneckCentre, setSelectedBottleneckCentre] = useState(null);
  const [sortBy, setSortBy] = useState('queue'); // 'queue' | 'wait' | 'severity' | 'throughput'
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Centre Requests States
  const [centreRequests, setCentreRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Add Centre Form State
  const [centreForm, setCentreForm] = useState({
    name: '',
    centreCode: '',
    location: '',
    district: '',
    state: 'Maharashtra',
    capacity: 50,
    activeCounters: 2,
    contactPerson: '',
    contactNumber: ''
  });
  const [submittingCentre, setSubmittingCentre] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBottlenecks = async () => {
    try {
      const response = await fetch('/api/analytics/bottlenecks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setBottlenecks(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBottlenecksLoading(false);
    }
  };

  const fetchCentreRequests = async () => {
    try {
      const response = await fetch('/api/centres/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setCentreRequests(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchBottlenecks();
    fetchCentreRequests();
  }, [token]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = io(window.location.origin);
    
    socket.on('bottlenecksUpdated', () => {
      fetchBottlenecks();
      fetchAnalytics();
    });

    socket.on('queueUpdated', () => {
      fetchBottlenecks();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleApproveCentre = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await fetch(`/api/centres/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        alert(t('centreApprovedSuccess'));
        fetchCentreRequests();
        fetchBottlenecks();
        fetchAnalytics();
      } else {
        alert(result.message || 'Approval failed');
      }
    } catch (err) {
      alert('Error approving centre');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectCentre = async (id) => {
    if (!window.confirm('Are you sure you want to reject this centre registration request?')) return;
    setActionLoadingId(id);
    try {
      const response = await fetch(`/api/centres/${id}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        alert(t('centreRejectedSuccess'));
        fetchCentreRequests();
        fetchBottlenecks();
      } else {
        alert(result.message || 'Rejection failed');
      }
    } catch (err) {
      alert('Error rejecting centre');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInputChange = (e) => {
    setCentreForm({
      ...centreForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddCentre = async (e) => {
    e.preventDefault();
    setSubmittingCentre(true);
    try {
      const response = await fetch('/api/centres', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(centreForm)
      });
      const result = await response.json();
      setSubmittingCentre(false);
      setShowAddCentreModal(false);

      if (result.success) {
        alert(t('centreAddedSuccess'));
        fetchAnalytics();
        fetchBottlenecks();
        fetchCentreRequests();
        setCentreForm({
          name: '',
          centreCode: '',
          location: '',
          district: '',
          state: 'Maharashtra',
          capacity: 50,
          activeCounters: 2,
          contactPerson: '',
          contactNumber: ''
        });
      } else {
        alert(result.message || 'Failed to add centre.');
      }
    } catch (err) {
      setSubmittingCentre(false);
      alert('Error connecting.');
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const { summary, cropProcurement, centreStats, paymentDistribution, dailyVolume } = analytics;

  // Trend analytics computed strictly from real returned dailyVolume data without mocking
  const trendData = Array.isArray(dailyVolume) ? dailyVolume : [];
  const totalVolume7Days = trendData.reduce((acc, curr) => acc + (Number(curr.volume) || 0), 0);
  const totalPayout7Days = trendData.reduce((acc, curr) => acc + (Number(curr.earnings) || 0), 0);
  const dataPointsCount = trendData.length;

  let trendChangePercent = null;
  let isPositiveTrend = true;
  let isNeutralTrend = false;

  if (dataPointsCount >= 2) {
    const firstVal = Number(trendData[0]?.volume) || 0;
    const lastVal = Number(trendData[dataPointsCount - 1]?.volume) || 0;
    if (firstVal === 0 && lastVal === 0) {
      isNeutralTrend = true;
      trendChangePercent = '0.0';
    } else if (firstVal === 0) {
      trendChangePercent = '+100';
      isPositiveTrend = true;
    } else {
      const diff = lastVal - firstVal;
      const pct = (diff / firstVal) * 100;
      isPositiveTrend = pct >= 0;
      isNeutralTrend = pct === 0;
      trendChangePercent = Math.abs(pct).toFixed(1);
    }
  }

  // Filter and sort bottlenecks
  const districtsList = Array.from(new Set(bottlenecks.map(b => b.district))).filter(Boolean);

  const filteredBottlenecks = bottlenecks.filter(b => {
    const matchesDistrict = districtFilter === 'ALL' || b.district?.toLowerCase() === districtFilter.toLowerCase();
    const matchesSearch = !searchQuery || 
      b.centreName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.centreCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.district?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDistrict && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'queue') return b.queueLength - a.queueLength;
    if (sortBy === 'wait') return b.avgWaitTime - a.avgWaitTime;
    if (sortBy === 'throughput') return a.throughputPerHour - b.throughputPerHour;
    if (sortBy === 'severity') {
      const rank = { 'CRITICAL': 3, 'MODERATE': 2, 'NORMAL': 1 };
      return (rank[b.severity] || 0) - (rank[a.severity] || 0);
    }
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-left space-y-6">
      
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-4xs uppercase font-bold text-emerald-700 tracking-wider block">{t('adminControlTitle')}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{t('adminControlTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('adminControlSubtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddCentreModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> {t('addCentreBtn')}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('totalFarmersKpi')}</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5 block">{summary.totalFarmers}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('farmer')}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('activeMandisKpi')}</span>
            <Building className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5 block">{summary.totalCentres}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('thCentre')}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('todayBookingsKpi')}</span>
            <Ticket className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5 block">{summary.todayBookings}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('BOOKED')}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('activeQueuesKpi')}</span>
            <Activity className="h-4 w-4 text-orange-500" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5 block">{summary.activeQueues}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('IN_QUEUE')}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('completedProcurementsKpi')}</span>
            <CheckSquare className="h-4 w-4 text-purple-600" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5 block">{summary.completedProcurements}</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{t('COMPLETED')}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex justify-between items-start text-gray-400">
            <span className="text-4xs font-bold uppercase tracking-wider text-gray-500">{t('pendingPayoutsKpi')}</span>
            <IndianRupee className="h-4 w-4 text-red-500" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-red-600 mt-1.5 block">₹{Math.round(summary.pendingPaymentsAmount / 1000)}k</span>
          <span className="text-4xs text-gray-400 mt-0.5 block">{summary.pendingPaymentsCount} {t('PENDING')}</span>
        </div>
      </div>

      {/* FEATURE 2: PROCUREMENT CENTRE BOTTLENECK MONITOR */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('bottleneckMonitorTitle')}</h3>
            </div>
            <p className="text-3xs text-gray-500 mt-0.5">{t('bottleneckMonitorSubtitle')}</p>
          </div>

          {/* Sort and Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-44">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchCentresPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* District Filter */}
            {districtsList.length > 0 && (
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 bg-white focus:outline-none"
              >
                <option value="ALL">{t('allDistricts')}</option>
                {districtsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

            {/* Sort Buttons */}
            <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg text-4xs font-bold">
              <button
                onClick={() => setSortBy('queue')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  sortBy === 'queue' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t('sortByHighestQueue')}
              </button>
              <button
                onClick={() => setSortBy('wait')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  sortBy === 'wait' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t('sortByHighestWait')}
              </button>
              <button
                onClick={() => setSortBy('severity')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  sortBy === 'severity' ? 'bg-white text-red-700 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t('sortByCriticalBottleneck')}
              </button>
              <button
                onClick={() => setSortBy('throughput')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  sortBy === 'throughput' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t('sortByLowestThroughput')}
              </button>
            </div>
          </div>
        </div>

        {/* Bottleneck Monitor Table */}
        {bottlenecksLoading ? (
          <div className="py-8 text-center text-xs text-gray-400">
            <span className="animate-spin inline-block h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full mb-2"></span>
            <p>Analyzing procurement workflow bottlenecks...</p>
          </div>
        ) : filteredBottlenecks.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
            No procurement centres match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-4xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">{t('thCentre')}</th>
                  <th className="py-2.5 px-3">{t('thQueue')}</th>
                  <th className="py-2.5 px-3">{t('estWaitTime')}</th>
                  <th className="py-2.5 px-3">{t('thThroughput')}</th>
                  <th className="py-2.5 px-3">{t('thBottleneck')}</th>
                  <th className="py-2.5 px-3">{t('thSeverity')}</th>
                  <th className="py-2.5 px-3 text-right">{t('thAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBottlenecks.map((centre) => (
                  <tr 
                    key={centre.centreId}
                    onClick={() => setSelectedBottleneckCentre(centre)}
                    className="hover:bg-emerald-50/30 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900">{centre.centreName}</div>
                      <div className="text-4xs text-gray-400 font-mono">
                        {centre.centreCode} • {centre.district}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-gray-800">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 font-bold text-xs">
                        {centre.queueLength}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-gray-700">
                      {centre.avgWaitTime} {t('minutes')}
                    </td>

                    <td className="py-2.5 px-3 font-medium text-gray-800">
                      {centre.throughputPerHour} / hr
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-gray-800">
                      {centre.severity === 'NORMAL' ? (
                        <span className="text-gray-400 font-normal">{t('none')}</span>
                      ) : (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          ⚠️ {t(centre.bottleneckStageKey, centre.bottleneckStage)}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase inline-flex items-center gap-1 ${
                        centre.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        centre.severity === 'MODERATE' ? 'bg-amber-100 text-amber-900' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {centre.severity === 'CRITICAL' && '🔴'}
                        {centre.severity === 'MODERATE' && '🟡'}
                        {centre.severity === 'NORMAL' && '🟢'}
                        {t(`severity${centre.severity.charAt(0) + centre.severity.slice(1).toLowerCase()}`, centre.severity)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBottleneckCentre(centre);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-4xs font-bold transition cursor-pointer"
                      >
                        <span>{t('inspectCentreAnalytics')}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FEATURE 1: PROCUREMENT CENTRE REQUESTS & APPROVAL WORKFLOW */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Building className="h-4 w-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('centreRequestsTitle')}</h3>
            </div>
            <p className="text-3xs text-gray-500 mt-0.5">{t('centreRequestsSubtitle')}</p>
          </div>
        </div>

        {requestsLoading ? (
          <div className="py-6 text-center text-xs text-gray-400">
            <span className="animate-spin inline-block h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mb-1"></span>
            <p>Loading centre applications...</p>
          </div>
        ) : centreRequests.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
            {t('noPendingRequests')}
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-4xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">{t('centreNameLabel')}</th>
                  <th className="py-2.5 px-3">{t('district')}</th>
                  <th className="py-2.5 px-3">{t('contactPersonName')}</th>
                  <th className="py-2.5 px-3">{t('countersLabel')} & {t('dailyFarmerCapacity')}</th>
                  <th className="py-2.5 px-3">{t('thDate')}</th>
                  <th className="py-2.5 px-3">{t('thStatus')}</th>
                  <th className="py-2.5 px-3 text-right">{t('thAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {centreRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50 font-medium">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900">{req.name}</div>
                      <div className="text-4xs text-gray-400 font-mono">
                        {req.centreCode || 'MANDI-REQ'}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-gray-700">
                      {req.district}, {req.state || 'MH'}
                    </td>

                    <td className="py-2.5 px-3 text-gray-700">
                      <div className="font-semibold">{req.contactPerson || 'N/A'}</div>
                      <div className="text-4xs text-gray-400">{req.contactNumber}</div>
                    </td>

                    <td className="py-2.5 px-3 text-gray-600">
                      {req.activeCounters || 2} {t('countersLabel')} / {req.capacity || 50} {t('dailyFarmerCapacity')}
                    </td>

                    <td className="py-2.5 px-3 text-gray-500 text-3xs">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase ${
                        req.status === 'APPROVED' || req.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-900'
                      }`}>
                        {t(req.status)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleApproveCentre(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-4xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>{t('approveCentreBtn')}</span>
                          </button>
                          <button
                            onClick={() => handleRejectCentre(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded-lg text-4xs font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                            <span>{t('rejectCentreBtn')}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-4xs text-gray-400 font-medium">
                          {req.status === 'APPROVED' || req.status === 'active' ? '✓ Active' : '✕ Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Box: Daily Procurement Volume */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">{t('chartDailyTrendTitle')}</h3>
                {dataPointsCount >= 2 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-bold border ${
                    isNeutralTrend 
                      ? 'bg-gray-50 text-gray-600 border-gray-200' 
                      : isPositiveTrend 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isNeutralTrend ? (
                      <Minus className="h-3 w-3" />
                    ) : isPositiveTrend ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{isPositiveTrend && !isNeutralTrend ? `+${trendChangePercent}%` : `${trendChangePercent}%`}</span>
                  </span>
                )}
                {dataPointsCount === 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    1 day recorded
                  </span>
                )}
              </div>
              <p className="text-4xs text-gray-400 mt-0.5">{t('chartDailyTrendSubtitle')}</p>
            </div>

            {/* Quick KPI stats derived directly from real returned data */}
            <div className="flex items-center gap-2 text-left">
              <div className="bg-emerald-50/70 border border-emerald-100 px-2.5 py-1 rounded-lg">
                <span className="text-4xs text-emerald-700 uppercase font-bold tracking-wider block">7-Day Total</span>
                <span className="text-xs font-bold text-emerald-900">{totalVolume7Days.toLocaleString()} Qtl</span>
              </div>
              {totalPayout7Days > 0 && (
                <div className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hidden sm:block">
                  <span className="text-4xs text-gray-500 uppercase font-bold tracking-wider block">Payout</span>
                  <span className="text-xs font-bold text-gray-800">₹{totalPayout7Days.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="dailyProcurementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.05} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  dy={6}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}`}
                  dx={-2}
                />
                <Tooltip content={<DailyTrendCustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  name="Procurement Volume"
                  stroke="#059669" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#dailyProcurementGradient)"
                  dot={{ r: 3.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#047857', stroke: '#a7f3d0', strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Box: Crop breakdown pie chart */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">{t('chartCropBreakdownTitle')}</h3>
          <p className="text-4xs text-gray-400">{t('chartCropBreakdownSubtitle')}</p>
          <div className="h-56 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropProcurement}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="volume"
                  nameKey="crop"
                >
                  {cropProcurement.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-3xs pt-1">
            {cropProcurement.map((entry, index) => (
              <div key={entry.crop} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-gray-600 font-medium truncate">{entry.crop} ({entry.volume} {t('quintals')})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Left: Centre comparison queues */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">{t('chartMandiCongestionTitle')}</h3>
          <p className="text-4xs text-gray-400">{t('chartMandiCongestionSubtitle')}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centreStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="queueCount" name={t('activeQueuesKpi')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookingsCount" name={t('todayBookingsKpi')} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Right: Payment status summary breakdown */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">{t('chartPayoutDistTitle')}</h3>
          <div className="space-y-3 pt-2">
            {paymentDistribution.map((item) => (
              <div key={item.status} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`h-2 w-2 rounded-full ${
                    item.status === 'COMPLETED' ? 'bg-emerald-500' :
                    item.status === 'PROCESSING' ? 'bg-blue-500' : 'bg-amber-500'
                  }`}></span>
                  <span className="font-semibold text-gray-700">{t(item.status)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900 block">₹{item.total.toLocaleString()}</span>
                  <span className="text-4xs text-gray-400 block">{item.count} transactions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Centre Modal */}
      {showAddCentreModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 text-left shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-emerald-600" /> {t('addCentreModalTitle')}
              </h3>
              <button 
                onClick={() => setShowAddCentreModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCentre} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {t('centreNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={centreForm.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Kalyan Grain Mandi"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {t('locationLabel')}
                </label>
                <input
                  type="text"
                  required
                  name="location"
                  value={centreForm.location}
                  onChange={handleInputChange}
                  placeholder="Street and landmark details"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('district')}
                  </label>
                  <input
                    type="text"
                    required
                    name="district"
                    value={centreForm.district}
                    onChange={handleInputChange}
                    placeholder="e.g. Pune"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('contactNumberLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    name="contactNumber"
                    value={centreForm.contactNumber}
                    onChange={handleInputChange}
                    placeholder="10-digit phone"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('capacityLabel')}
                  </label>
                  <input
                    type="number"
                    required
                    name="capacity"
                    value={centreForm.capacity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('countersLabel')}
                  </label>
                  <input
                    type="number"
                    required
                    name="activeCounters"
                    value={centreForm.activeCounters}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCentreModal(false)}
                  className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingCentre}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {submittingCentre ? t('loading') : t('saveCentreBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Centre Bottleneck Details Modal */}
      {selectedBottleneckCentre && (
        <BottleneckDetailModal
          isOpen={Boolean(selectedBottleneckCentre)}
          onClose={() => setSelectedBottleneckCentre(null)}
          centreData={selectedBottleneckCentre}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
