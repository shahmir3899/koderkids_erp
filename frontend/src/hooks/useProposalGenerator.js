// ============================================
// USE PROPOSAL GENERATOR HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { proposalService } from '../services/proposalService';
import { fetchLeads, fetchLeadById } from '../api/services/crmService';

const DEFAULT_PAGE_SELECTION = {
  1: true, 2: true, 3: true, 4: true, 5: false, 6: false, 7: true,
  8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true,
};

const DEFAULT_FEATURE_ITEMS = [
  'Digital & Interactive Learning Platform',
  'AI Powered Personalised Learning',
  'Smart Homework System',
  'Progress Monitoring Dashboard',
  'Real-Time Academic Reports',
  'Automated Attendance System',
];

const DEFAULT_PAGE1_TEXT_CONFIG = {
  coverLine: { x: 0.5012, y: 0.5555, fontSize: 12, color: '#FFFFFF' },
  schoolName: { x: 0.50, y: 0.5555, fontSize: 28, color: '#FFFFFF' },
  contactPerson: { x: 0.50, y: 0.51, fontSize: 20, color: '#FFFFFF' },
};

const DEFAULT_PAGE13_TEXT_CONFIG = {
  discountedRate: { x: 0.2454, y: 0.3326, fontSize: 20, color: '#FFFFFF' },
  standardRate: { x: 0.2454, y: 0.3824, fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  lumpsumDiscountedRate: { x: 0.7549, y: 0.3326, fontSize: 20, color: '#FFFFFF' },
  lumpsumStandardRate: { x: 0.7549, y: 0.3824, fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  featureList: { x: 0.1964, y: 0.7195, fontSize: 10, color: '#FFFFFF', lineHeight: 0.035 },
  strikethrough: true,
};

const DEFAULT_RATE_SLABS = {
  per_student: [
    { min_students: 1, max_students: 30, suggested_standard_rate: 2000, suggested_discounted_rate: 1000, sort_order: 1 },
    { min_students: 31, max_students: 50, suggested_standard_rate: 1300, suggested_discounted_rate: 1000, sort_order: 2 },
    { min_students: 51, max_students: 80, suggested_standard_rate: 800, suggested_discounted_rate: 700, sort_order: 3 },
    { min_students: 81, max_students: 120, suggested_standard_rate: 700, suggested_discounted_rate: 600, sort_order: 4 },
    { min_students: 121, max_students: 150, suggested_standard_rate: 700, suggested_discounted_rate: 600, sort_order: 5 },
  ],
  lumpsum: [
    { min_students: 1, max_students: 30, suggested_standard_rate: 50000, suggested_discounted_rate: 35000, sort_order: 1 },
    { min_students: 31, max_students: 50, suggested_standard_rate: 50000, suggested_discounted_rate: 35000, sort_order: 2 },
    { min_students: 51, max_students: 80, suggested_standard_rate: 50000, suggested_discounted_rate: 35000, sort_order: 3 },
    { min_students: 81, max_students: 120, suggested_standard_rate: 50000, suggested_discounted_rate: 35000, sort_order: 4 },
    { min_students: 121, max_students: 150, suggested_standard_rate: 50000, suggested_discounted_rate: 35000, sort_order: 5 },
  ],
};

const normalizeNumericRate = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number.parseInt(String(value).replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? String(parsed) : '';
};

const findMatchingSlab = (slabs, expectedStrength) => {
  const normalizedStrength = Number.parseInt(expectedStrength, 10);
  if (!Number.isFinite(normalizedStrength) || normalizedStrength <= 0 || !Array.isArray(slabs)) {
    return null;
  }

  return slabs.find((slab) => {
    const min = Number.parseInt(slab.min_students, 10);
    const max = Number.parseInt(slab.max_students, 10);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    return normalizedStrength >= min && normalizedStrength <= max;
  }) || null;
};

export const useProposalGenerator = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================
  // FORM STATE
  // ============================================
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [expectedStrength, setExpectedStrength] = useState('');
  const [standardRate, setStandardRate] = useState('');
  const [discountedRate, setDiscountedRate] = useState('');
  const [lumpsumStandardRate, setLumpsumStandardRate] = useState('');
  const [lumpsumDiscountedRate, setLumpsumDiscountedRate] = useState('');
  const [rateSlabs, setRateSlabs] = useState({ ...DEFAULT_RATE_SLABS });
  const [slabLoading, setSlabLoading] = useState(false);
  const [slabSaving, setSlabSaving] = useState(false);

  const matchedPerStudentSlab = useMemo(() => {
    return findMatchingSlab(rateSlabs.per_student, expectedStrength);
  }, [rateSlabs.per_student, expectedStrength]);

  const matchedLumpsumSlab = useMemo(() => {
    return findMatchingSlab(rateSlabs.lumpsum, expectedStrength);
  }, [rateSlabs.lumpsum, expectedStrength]);

  const suggestedStandardRate = useMemo(() => normalizeNumericRate(matchedPerStudentSlab?.suggested_standard_rate), [matchedPerStudentSlab]);
  const suggestedDiscountedRate = useMemo(() => normalizeNumericRate(matchedPerStudentSlab?.suggested_discounted_rate), [matchedPerStudentSlab]);
  const suggestedLumpsumStandardRate = useMemo(() => normalizeNumericRate(matchedLumpsumSlab?.suggested_standard_rate), [matchedLumpsumSlab]);
  const suggestedLumpsumDiscountedRate = useMemo(() => normalizeNumericRate(matchedLumpsumSlab?.suggested_discounted_rate), [matchedLumpsumSlab]);

  const coverLineValue = useMemo(() => {
    return [schoolName.trim(), contactPerson.trim()].filter(Boolean).join(' - ');
  }, [schoolName, contactPerson]);

  const setCoverLineValue = useCallback((value) => {
    const rawValue = value || '';
    const separatorIndex = rawValue.indexOf(' - ');

    if (separatorIndex === -1) {
      setSchoolName(rawValue);
      setContactPerson('');
      return;
    }

    setSchoolName(rawValue.slice(0, separatorIndex).trim());
    setContactPerson(rawValue.slice(separatorIndex + 3).trim());
  }, []);

  useEffect(() => {
    if (!expectedStrength) {
      return;
    }

    const nextPerStudentStandard = suggestedStandardRate || '';
    const nextPerStudentDiscounted = suggestedDiscountedRate || '';
    const nextLumpsumStandard = suggestedLumpsumStandardRate || '';
    const nextLumpsumDiscounted = suggestedLumpsumDiscountedRate || '';

    setStandardRate(nextPerStudentStandard);
    setDiscountedRate(nextPerStudentDiscounted);
    setLumpsumStandardRate(nextLumpsumStandard);
    setLumpsumDiscountedRate(nextLumpsumDiscounted);
  }, [expectedStrength, suggestedStandardRate, suggestedDiscountedRate, suggestedLumpsumStandardRate, suggestedLumpsumDiscountedRate]);

  // ============================================
  // PAGE SELECTION
  // ============================================
  const [pageSelection, setPageSelection] = useState({ ...DEFAULT_PAGE_SELECTION });

  const togglePage = useCallback((pageNum) => {
    setPageSelection(prev => ({ ...prev, [pageNum]: !prev[pageNum] }));
  }, []);

  const selectAllPages = useCallback(() => {
    const allSelected = Object.keys(DEFAULT_PAGE_SELECTION).reduce((acc, pageNum) => {
      acc[pageNum] = true;
      return acc;
    }, {});
    setPageSelection(allSelected);
  }, []);

  const unselectAllPages = useCallback(() => {
    const allUnselected = Object.keys(DEFAULT_PAGE_SELECTION).reduce((acc, pageNum) => {
      acc[pageNum] = false;
      return acc;
    }, {});
    setPageSelection(allUnselected);
  }, []);

  const resetDefaultPageSelection = useCallback(() => {
    setPageSelection({ ...DEFAULT_PAGE_SELECTION });
  }, []);

  // ============================================
  // TEXT CONFIG STATE
  // ============================================
  const [page1TextConfig, setPage1TextConfig] = useState({ ...DEFAULT_PAGE1_TEXT_CONFIG });
  const [page13TextConfig, setPage13TextConfig] = useState({ ...DEFAULT_PAGE13_TEXT_CONFIG });

  const updatePage1TextPos = useCallback((field, pos) => {
    setPage1TextConfig(prev => ({
      ...prev,
      [field]: { ...prev[field], x: pos.x, y: pos.y },
    }));
  }, []);

  const updatePage13TextPos = useCallback((field, pos) => {
    setPage13TextConfig(prev => ({
      ...prev,
      [field]: { ...prev[field], x: pos.x, y: pos.y },
    }));
  }, []);

  const updateTextColor = useCallback((page, field, color) => {
    const setter = page === 1 ? setPage1TextConfig : setPage13TextConfig;
    setter(prev => ({
      ...prev,
      [field]: { ...prev[field], color },
    }));
  }, []);

  const updateFontSize = useCallback((page, field, fontSize) => {
    const setter = page === 1 ? setPage1TextConfig : setPage13TextConfig;
    setter(prev => ({
      ...prev,
      [field]: { ...prev[field], fontSize },
    }));
  }, []);

  const toggleStrikethrough = useCallback(() => {
    setPage13TextConfig(prev => ({ ...prev, strikethrough: !prev.strikethrough }));
  }, []);

  // ============================================
  // FEATURE ITEMS (Page 13 tick list)
  // ============================================
  const [featureItems, setFeatureItems] = useState([...DEFAULT_FEATURE_ITEMS]);

  const addFeatureItem = useCallback((text = '') => {
    setFeatureItems(prev => [...prev, text]);
  }, []);

  const removeFeatureItem = useCallback((index) => {
    setFeatureItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateFeatureItem = useCallback((index, text) => {
    setFeatureItems(prev => prev.map((item, i) => i === index ? text : item));
  }, []);

  // ============================================
  // RATE SLABS
  // ============================================
  const loadRateSlabs = useCallback(async () => {
    setSlabLoading(true);
    try {
      const data = await proposalService.fetchRateSlabs();
      setRateSlabs({
        per_student: Array.isArray(data?.per_student) && data.per_student.length > 0 ? data.per_student : DEFAULT_RATE_SLABS.per_student,
        lumpsum: Array.isArray(data?.lumpsum) && data.lumpsum.length > 0 ? data.lumpsum : DEFAULT_RATE_SLABS.lumpsum,
      });
    } catch (err) {
      console.error('Error fetching rate slabs:', err);
      setRateSlabs({ ...DEFAULT_RATE_SLABS });
    } finally {
      setSlabLoading(false);
    }
  }, []);

  const createRateSlab = useCallback(async (payload) => {
    setSlabSaving(true);
    try {
      const created = await proposalService.createRateSlab(payload);
      await loadRateSlabs();
      toast.success('Rate slab created');
      return created;
    } catch (err) {
      console.error('Error creating rate slab:', err);
      toast.error(err?.response?.data?.detail || 'Failed to create slab');
      return null;
    } finally {
      setSlabSaving(false);
    }
  }, [loadRateSlabs]);

  const updateRateSlab = useCallback(async (slabId, payload) => {
    setSlabSaving(true);
    try {
      const updated = await proposalService.updateRateSlab(slabId, payload);
      await loadRateSlabs();
      toast.success('Rate slab updated');
      return updated;
    } catch (err) {
      console.error('Error updating rate slab:', err);
      toast.error(err?.response?.data?.detail || 'Failed to update slab');
      return null;
    } finally {
      setSlabSaving(false);
    }
  }, [loadRateSlabs]);

  const deleteRateSlab = useCallback(async (slabId) => {
    setSlabSaving(true);
    try {
      await proposalService.deleteRateSlab(slabId);
      await loadRateSlabs();
      toast.success('Rate slab deleted');
      return true;
    } catch (err) {
      console.error('Error deleting rate slab:', err);
      toast.error(err?.response?.data?.detail || 'Failed to delete slab');
      return false;
    } finally {
      setSlabSaving(false);
    }
  }, [loadRateSlabs]);

  // ============================================
  // LEADS STATE
  // ============================================
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // ============================================
  // HISTORY STATE
  // ============================================
  const [proposalHistory, setProposalHistory] = useState([]);
  const [selectedHistoryProposal, setSelectedHistoryProposal] = useState(null);

  // ============================================
  // LOADING STATES
  // ============================================
  const [loading, setLoading] = useState({
    history: false,
    saving: false,
    deleting: false,
    generating: false,
  });
  const [progress, setProgress] = useState('');

  // ============================================
  // FETCH LEADS
  // ============================================
  const loadLeads = useCallback(async (search = '') => {
    setLeadsLoading(true);
    try {
      const data = await fetchLeads({ search });
      setLeads(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  // ============================================
  // SELECT LEAD (auto-fill)
  // ============================================
  const selectLead = useCallback((lead) => {
    // Normalize fields because some endpoints/objects may use camelCase keys.
    const leadId = lead?.id || null;
    const leadSchoolName = lead?.school_name || lead?.schoolName || lead?.name || '';
    const leadContactPerson = lead?.contact_person || lead?.contactPerson || '';
    const leadExpectedStrength = lead?.expected_strength || lead?.expectedStrength || '';

    setSelectedLeadId(leadId);
    setSchoolName(leadSchoolName);
    setContactPerson(leadContactPerson);
    setExpectedStrength(leadExpectedStrength ? String(leadExpectedStrength) : '');
  }, []);

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  // ============================================
  // FETCH PROPOSAL HISTORY
  // ============================================
  const fetchProposalHistory = useCallback(async () => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const data = await proposalService.fetchProposals({ limit: 50 });
      setProposalHistory(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error('Error fetching proposal history:', err);
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, []);

  // ============================================
  // SAVE PROPOSAL TO DB
  // ============================================
  const saveProposalToDb = useCallback(async () => {
    if (!schoolName.trim()) {
      toast.error('School name is required');
      return null;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    try {
      const proposalData = {
        lead: selectedLeadId,
        school_name: schoolName,
        contact_person: contactPerson,
        expected_strength: expectedStrength ? Number.parseInt(expectedStrength, 10) : null,
        standard_rate: standardRate ? `PKR ${standardRate}` : '',
        discounted_rate: discountedRate ? `PKR ${discountedRate}` : '',
        lumpsum_standard_rate: lumpsumStandardRate ? `PKR ${lumpsumStandardRate}` : '',
        lumpsum_discounted_rate: lumpsumDiscountedRate ? `PKR ${lumpsumDiscountedRate}` : '',
        page_selection: pageSelection,
        feature_items: featureItems,
      };

      const saved = await proposalService.saveProposal(proposalData);
      toast.success('Proposal saved');
      await fetchProposalHistory();
      return saved;
    } catch (err) {
      console.error('Error saving proposal:', err);
      toast.error('Failed to save proposal');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [selectedLeadId, schoolName, contactPerson, expectedStrength, standardRate, discountedRate, lumpsumStandardRate, lumpsumDiscountedRate, pageSelection, featureItems, fetchProposalHistory]);

  // ============================================
  // LOAD HISTORICAL PROPOSAL
  // ============================================
  const loadHistoricalProposal = useCallback(async (proposalId) => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const proposal = await proposalService.fetchProposalById(proposalId);
      setSelectedLeadId(proposal.lead);
      setSchoolName(proposal.school_name);
      setContactPerson(proposal.contact_person || '');
      setExpectedStrength(proposal.expected_strength ? String(proposal.expected_strength) : '');
      setStandardRate((proposal.standard_rate || '').replace(/^PKR\s*/, ''));
      setDiscountedRate((proposal.discounted_rate || '').replace(/^PKR\s*/, ''));
      setLumpsumStandardRate((proposal.lumpsum_standard_rate || '').replace(/^PKR\s*/, ''));
      setLumpsumDiscountedRate((proposal.lumpsum_discounted_rate || '').replace(/^PKR\s*/, ''));
      setPageSelection({
        ...DEFAULT_PAGE_SELECTION,
        ...(proposal.page_selection || {}),
      });
      if (Array.isArray(proposal.feature_items) && proposal.feature_items.length > 0) {
        setFeatureItems(proposal.feature_items);
      }
      setSelectedHistoryProposal(proposal);
      toast.success('Proposal loaded');
    } catch (err) {
      console.error('Error loading proposal:', err);
      toast.error('Failed to load proposal');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, []);

  // ============================================
  // CLEAR FORM
  // ============================================
  const clearForm = useCallback(() => {
    setSelectedLeadId(null);
    setSchoolName('');
    setContactPerson('');
    setExpectedStrength('');
    setStandardRate('');
    setDiscountedRate('');
    setLumpsumStandardRate('');
    setLumpsumDiscountedRate('');
    setPageSelection({ ...DEFAULT_PAGE_SELECTION });
    setFeatureItems([...DEFAULT_FEATURE_ITEMS]);
    setPage1TextConfig({ ...DEFAULT_PAGE1_TEXT_CONFIG });
    setPage13TextConfig({ ...DEFAULT_PAGE13_TEXT_CONFIG });
    setSelectedHistoryProposal(null);
  }, []);

  // ============================================
  // DELETE HISTORICAL PROPOSAL
  // ============================================
  const deleteHistoricalProposal = useCallback(async (proposalId) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    try {
      await proposalService.deleteProposal(proposalId);
      toast.success('Proposal deleted');
      if (selectedHistoryProposal?.id === proposalId) {
        clearForm();
      }
      await fetchProposalHistory();
    } catch (err) {
      console.error('Error deleting proposal:', err);
      toast.error('Failed to delete proposal');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [selectedHistoryProposal, fetchProposalHistory, clearForm]);

  // ============================================
  // VALIDATION
  // ============================================
  const isFormValid = useMemo(() => {
    return schoolName.trim().length > 0;
  }, [schoolName]);

  const selectedPageCount = useMemo(() => {
    return Object.values(pageSelection).filter(Boolean).length;
  }, [pageSelection]);

  const validateStep = useCallback((step) => {
    switch (step) {
      case 1:
        return schoolName.trim().length > 0;
      case 2:
        return expectedStrength.trim().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return schoolName.trim().length > 0 && expectedStrength.trim().length > 0 && selectedPageCount > 0;
      default:
        return false;
    }
  }, [schoolName, expectedStrength, selectedPageCount]);

  // ============================================
  // INITIAL FETCH
  // ============================================
  useEffect(() => {
    loadLeads();
    fetchProposalHistory();
    loadRateSlabs();
  }, [loadLeads, fetchProposalHistory, loadRateSlabs]);

  // ============================================
  // AUTO-SELECT LEAD FROM URL PARAM (?leadId=X)
  // ============================================
  useEffect(() => {
    const leadIdParam = searchParams.get('leadId');
    if (leadIdParam && !selectedLeadId) {
      (async () => {
        try {
          const lead = await fetchLeadById(leadIdParam);
          if (lead) {
            selectLead(lead);
          }
        } catch (err) {
          console.error('Error auto-selecting lead from URL:', err);
        } finally {
          // Clean up URL param after consuming
          searchParams.delete('leadId');
          setSearchParams(searchParams, { replace: true });
        }
      })();
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Form state
    selectedLeadId, schoolName, setSchoolName,
    contactPerson, setContactPerson,
    expectedStrength, setExpectedStrength,
    coverLineValue, setCoverLineValue,
    standardRate, setStandardRate,
    suggestedStandardRate,
    suggestedDiscountedRate,
    discountedRate, setDiscountedRate,
    suggestedLumpsumStandardRate,
    lumpsumStandardRate, setLumpsumStandardRate,
    suggestedLumpsumDiscountedRate,
    lumpsumDiscountedRate, setLumpsumDiscountedRate,
    matchedPerStudentSlab,
    matchedLumpsumSlab,
    rateSlabs,
    slabLoading,
    slabSaving,
    loadRateSlabs,
    createRateSlab,
    updateRateSlab,
    deleteRateSlab,
    // Page selection
    pageSelection, togglePage, selectedPageCount,
    selectAllPages, unselectAllPages, resetDefaultPageSelection,
    // Text config
    page1TextConfig, page13TextConfig,
    updatePage1TextPos, updatePage13TextPos,
    updateTextColor, updateFontSize, toggleStrikethrough,
    // Feature items
    featureItems, addFeatureItem, removeFeatureItem, updateFeatureItem,
    // Leads
    leads, leadsLoading, loadLeads, selectLead, clearLeadSelection,
    // History
    proposalHistory, selectedHistoryProposal,
    loadHistoricalProposal, deleteHistoricalProposal,
    fetchProposalHistory,
    // Actions
    saveProposalToDb, clearForm,
    // State
    loading, setLoading, isFormValid, progress, setProgress,
    validateStep,
  };
};
