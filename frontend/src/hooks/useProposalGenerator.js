// ============================================
// USE PROPOSAL GENERATOR HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  discountedRate: { x: 0.2454, y: 0.4125, fontSize: 20, color: '#FFFFFF' },
  standardRate: { x: 0.2454, y: 0.4125, fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  lumpsumDiscountedRate: { x: 0.7549, y: 0.3326, fontSize: 20, color: '#FFFFFF' },
  lumpsumStandardRate: { x: 0.7449, y: 0.3824, fontSize: 20, color: 'rgba(255,255,255,0.6)' },
  featureList: { x: 0.1964, y: 0.7195, fontSize: 10, color: '#FFFFFF', lineHeight: 0.035 },
  strikethrough: true,
};

export const useProposalGenerator = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================
  // FORM STATE
  // ============================================
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [standardRate, setStandardRate] = useState('2,500');
  const [discountedRate, setDiscountedRate] = useState('1,000');
  const [lumpsumStandardRate, setLumpsumStandardRate] = useState('50,000');
  const [lumpsumDiscountedRate, setLumpsumDiscountedRate] = useState('35,000');

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

    setSelectedLeadId(leadId);
    setSchoolName(leadSchoolName);
    setContactPerson(leadContactPerson);
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
        standard_rate: `PKR ${standardRate}`,
        discounted_rate: `PKR ${discountedRate}`,
        lumpsum_standard_rate: `PKR ${lumpsumStandardRate}`,
        lumpsum_discounted_rate: `PKR ${lumpsumDiscountedRate}`,
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
  }, [selectedLeadId, schoolName, contactPerson, standardRate, discountedRate, lumpsumStandardRate, lumpsumDiscountedRate, pageSelection, featureItems, fetchProposalHistory]);

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
      setStandardRate((proposal.standard_rate || '').replace(/^PKR\s*/, ''));
      setDiscountedRate((proposal.discounted_rate || '').replace(/^PKR\s*/, ''));
      setLumpsumStandardRate((proposal.lumpsum_standard_rate || '').replace(/^PKR\s*/, '') || '50,000');
      setLumpsumDiscountedRate((proposal.lumpsum_discounted_rate || '').replace(/^PKR\s*/, '') || '35,000');
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
  }, [selectedHistoryProposal, fetchProposalHistory]);

  // ============================================
  // CLEAR FORM
  // ============================================
  const clearForm = useCallback(() => {
    setSelectedLeadId(null);
    setSchoolName('');
    setContactPerson('');
    setStandardRate('2,500');
    setDiscountedRate('1,000');
    setLumpsumStandardRate('50,000');
    setLumpsumDiscountedRate('35,000');
    setPageSelection({ ...DEFAULT_PAGE_SELECTION });
    setFeatureItems([...DEFAULT_FEATURE_ITEMS]);
    setPage1TextConfig({ ...DEFAULT_PAGE1_TEXT_CONFIG });
    setPage13TextConfig({ ...DEFAULT_PAGE13_TEXT_CONFIG });
    setSelectedHistoryProposal(null);
  }, []);

  // ============================================
  // VALIDATION
  // ============================================
  const isFormValid = useMemo(() => {
    return schoolName.trim().length > 0;
  }, [schoolName]);

  const selectedPageCount = useMemo(() => {
    return Object.values(pageSelection).filter(Boolean).length;
  }, [pageSelection]);

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
    standardRate, setStandardRate,
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
  };
};
