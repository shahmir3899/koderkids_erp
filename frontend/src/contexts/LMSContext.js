// ============================================
// LMS CONTEXT - Course & Progress State Management
// ============================================
// Location: src/contexts/LMSContext.js

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as courseService from '../services/courseService';
import { toast } from 'react-toastify';

const LMSContext = createContext();

/**
 * LMS Provider Component
 * Manages course enrollment, progress, and player state
 */
export const LMSProvider = ({ children }) => {
  // My courses state
  const [myCourses, setMyCourses] = useState([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);

  // Current course state (for player)
  const [currentCourse, setCurrentCourse] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Topic content state
  const [topicContent, setTopicContent] = useState(null);
  const [topicLoading, setTopicLoading] = useState(false);

  // Progress tracking
  const [topicProgress, setTopicProgress] = useState({});
  const heartbeatRef = useRef(null);

  // Continue learning
  const [continueLearning, setContinueLearning] = useState(null);

  // =============================================
  // My Courses
  // =============================================

  const fetchMyCourses = useCallback(async () => {
    setMyCoursesLoading(true);
    try {
      const data = await courseService.getMyCourses();
      setMyCourses(data);
    } catch (error) {
      console.error('Error fetching my courses:', error);
      toast.error('Failed to load your courses');
    } finally {
      setMyCoursesLoading(false);
    }
  }, []);

  const fetchContinueLearning = useCallback(async () => {
    try {
      const data = await courseService.getContinueLearning();
      setContinueLearning(data);
    } catch (error) {
      console.error('Error fetching continue learning:', error);
    }
  }, []);

  // =============================================
  // Enrollment
  // =============================================

  const enrollInCourse = useCallback(async (courseId) => {
    try {
      const enrollment = await courseService.enrollInCourse(courseId);
      toast.success('Successfully enrolled!');
      // Refresh my courses
      await fetchMyCourses();
      return enrollment;
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error(error.message || 'Failed to enroll');
      throw error;
    }
  }, [fetchMyCourses]);

  const unenrollFromCourse = useCallback(async (courseId) => {
    try {
      await courseService.unenrollFromCourse(courseId);
      toast.success('Successfully unenrolled');
      // Refresh my courses
      await fetchMyCourses();
    } catch (error) {
      console.error('Unenroll error:', error);
      toast.error(error.message || 'Failed to unenroll');
      throw error;
    }
  }, [fetchMyCourses]);

  const autoEnrollAll = useCallback(async () => {
    try {
      const result = await courseService.autoEnrollAll();
      if (result.message) {
        toast.success(result.message);
      }
      // Refresh my courses
      await fetchMyCourses();
      return result;
    } catch (error) {
      console.error('Auto-enroll error:', error);
      // Don't show error for Admin/Teacher
      if (error.message?.includes('Student profile')) {
        // Admin/Teacher don't need to enroll
        return null;
      }
      toast.error(error.message || 'Failed to auto-enroll');
      throw error;
    }
  }, [fetchMyCourses]);

  // =============================================
  // Course Player
  // =============================================

  const loadCourse = useCallback(async (courseId) => {
    setCourseLoading(true);
    try {
      const data = await courseService.getCourseDetail(courseId);
      setCurrentCourse(data);

      // Build progress map from topics tree (each topic has progress embedded)
      const progressMap = {};

      const extractProgress = (topics) => {
        if (!topics) return;
        topics.forEach((topic) => {
          if (topic.progress) {
            progressMap[topic.id] = topic.progress;
          }
          if (topic.children?.length) {
            extractProgress(topic.children);
          }
        });
      };

      extractProgress(data.topics);

      // Also merge from enrollment if available (for students)
      if (data.enrollment?.topic_progress) {
        data.enrollment.topic_progress.forEach((p) => {
          progressMap[p.topic_id] = p;
        });
      }

      setTopicProgress(progressMap);

      return data;
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error('Failed to load course');
      throw error;
    } finally {
      setCourseLoading(false);
    }
  }, []);

  const loadTopicContent = useCallback(async (topicId) => {
    setTopicLoading(true);
    try {
      const content = await courseService.getTopicContent(topicId);
      setTopicContent(content);
      setCurrentTopic(content);

      // Mark as started
      await courseService.startTopic(topicId);

      // Update local progress
      setTopicProgress((prev) => ({
        ...prev,
        [topicId]: {
          ...prev[topicId],
          status: prev[topicId]?.status === 'completed' ? 'completed' : 'in_progress',
          is_unlocked: true,
        },
      }));

      return content;
    } catch (error) {
      console.error('Error loading topic:', error);
      if (error.message.includes('locked')) {
        toast.warning('Complete previous topics first');
      } else {
        toast.error('Failed to load topic');
      }
      throw error;
    } finally {
      setTopicLoading(false);
    }
  }, []);

  // =============================================
  // Progress Tracking
  // =============================================

  const markTopicComplete = useCallback(async (topicId) => {
    try {
      const result = await courseService.completeTopic(topicId);

      // Update local progress
      setTopicProgress((prev) => ({
        ...prev,
        [topicId]: {
          ...prev[topicId],
          status: 'completed',
        },
      }));

      if (result.course_completed) {
        toast.success('Congratulations! Course completed!');
      } else {
        toast.success('Topic completed!');
      }

      return result;
    } catch (error) {
      console.error('Error completing topic:', error);
      toast.error('Failed to mark as complete');
      throw error;
    }
  }, []);

  // Start heartbeat when viewing a topic
  const startHeartbeat = useCallback((topicId) => {
    // Clear existing heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(async () => {
      try {
        await courseService.sendHeartbeat(topicId, 30);
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Clean up heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  // =============================================
  // Navigation Helpers
  // =============================================

  const getTopicStatus = useCallback((topicId) => {
    const progress = topicProgress[topicId];
    if (!progress) {
      return { status: 'not_started', is_unlocked: false };
    }
    return {
      status: progress.status || 'not_started',
      is_unlocked: progress.is_unlocked !== false,
    };
  }, [topicProgress]);

  const findFirstUnlockedTopic = useCallback((topics) => {
    // Recursively find first unlocked, incomplete topic
    for (const topic of topics) {
      const status = getTopicStatus(topic.id);
      if (status.is_unlocked && status.status !== 'completed') {
        return topic;
      }
      if (topic.children?.length) {
        const found = findFirstUnlockedTopic(topic.children);
        if (found) return found;
      }
    }
    return topics[0]; // Fallback to first topic
  }, [getTopicStatus]);

  const findNextTopic = useCallback((topics, currentTopicId, found = { value: false }) => {
    for (const topic of topics) {
      if (found.value) {
        // Return first topic after current
        const status = getTopicStatus(topic.id);
        if (status.is_unlocked) {
          return topic;
        }
      }
      if (topic.id === currentTopicId) {
        found.value = true;
      }
      if (topic.children?.length) {
        const next = findNextTopic(topic.children, currentTopicId, found);
        if (next) return next;
      }
    }
    return null;
  }, [getTopicStatus]);

  const findPreviousTopic = useCallback((topics, currentTopicId, prev = { value: null }) => {
    for (const topic of topics) {
      if (topic.id === currentTopicId) {
        return prev.value;
      }
      const status = getTopicStatus(topic.id);
      if (status.is_unlocked || status.status === 'completed') {
        prev.value = topic;
      }
      if (topic.children?.length) {
        const found = findPreviousTopic(topic.children, currentTopicId, prev);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }, [getTopicStatus]);

  // =============================================
  // Context Value
  // =============================================

  const value = {
    // My courses
    myCourses,
    myCoursesLoading,
    fetchMyCourses,

    // Enrollment
    enrollInCourse,
    unenrollFromCourse,
    autoEnrollAll,

    // Continue learning
    continueLearning,
    fetchContinueLearning,

    // Course player
    currentCourse,
    currentTopic,
    courseLoading,
    loadCourse,

    // Topic content
    topicContent,
    topicLoading,
    loadTopicContent,

    // Progress
    topicProgress,
    markTopicComplete,
    getTopicStatus,

    // Heartbeat
    startHeartbeat,
    stopHeartbeat,

    // Navigation
    findFirstUnlockedTopic,
    findNextTopic,
    findPreviousTopic,

    // Reset
    resetPlayer: () => {
      setCurrentCourse(null);
      setCurrentTopic(null);
      setTopicContent(null);
      setTopicProgress({});
      stopHeartbeat();
    },
  };

  return <LMSContext.Provider value={value}>{children}</LMSContext.Provider>;
};

/**
 * useLMS Hook
 * Access LMS state and actions
 */
export const useLMS = () => {
  const context = useContext(LMSContext);
  if (!context) {
    throw new Error('useLMS must be used within LMSProvider');
  }
  return context;
};

export default LMSContext;
