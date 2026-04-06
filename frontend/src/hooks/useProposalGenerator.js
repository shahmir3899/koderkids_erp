// ============================================
// USE PROPOSAL GENERATOR HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { proposalService } from '../services/proposalService';
import { fetchLeads, fetchLeadById } from '../api/services/crmService';

const DEFAULT_PAGE_SELECTION = {
  1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true,
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

const STANDARD_RATE_SLABS = [
  { maxStudents: 30, startingPrice: '2,000' },
  { maxStudents: 50, startingPrice: '1,300' },
  { maxStudents: 80, startingPrice: '800' },
  { maxStudents: 120, startingPrice: '700' },
  { maxStudents: 150, startingPrice: '700' },
];

const getSuggestedStandardRateFromStrength = (expectedStrength) => {
  const normalizedStrength = Number.parseInt(expectedStrength, 10);

  if (!Number.isFinite(normalizedStrength) || normalizedStrength <= 0) {
    return '';
  }

  const matchedSlab = STANDARD_RATE_SLABS.find(({ maxStudents }) => normalizedStrength <= maxStudents);
  return matchedSlab?.startingPrice || '';
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
  const lastSuggestedStandardRateRef = useRef('');

  const suggestedStandardRate = useMemo(() => {
    return getSuggestedStandardRateFromStrength(expectedStrength);
  }, [expectedStrength]);

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
      lastSuggestedStandardRateRef.current = '';
      return;
    }

    const nextSuggestedRate = suggestedStandardRate || '';

    setStandardRate((previousRate) => {
      if (!previousRate || previousRate === lastSuggestedStandardRateRef.current) {
        return nextSuggestedRate;
      }

      return previousRate;
    });

    lastSuggestedStandardRateRef.current = nextSuggestedRate;
  }, [expectedStrength, suggestedStandardRate]);

  // ============================================
  // PAGE SELECTION
  // ============================================
  const [pageSelection, setPageSelection] = useState({ ...DEFAULT_PAGE_SELECTION });

  const togglePage = useCallback((pageNum) => {
    setPageSelection(prev => ({ ...prev, [pageNum]: !prev[pageNum] }));
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
      if (proposal.page_selection && Object.keys(proposal.page_selection).length > 0) {
        setPageSelection(proposal.page_selection);
      }
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
  }, [loadLeads, fetchProposalHistory]);

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
    discountedRate, setDiscountedRate,
    lumpsumStandardRate, setLumpsumStandardRate,
    lumpsumDiscountedRate, setLumpsumDiscountedRate,
    // Page selection
    pageSelection, togglePage, selectedPageCount,
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
