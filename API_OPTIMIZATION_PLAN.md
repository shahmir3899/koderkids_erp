# API Performance Optimization Plan

## Executive Summary

The application suffers from slow performance due to excessive API calls. Analysis identified **41+ axios calls across 11 page files** and **12+ calls in components**, with no request deduplication, inconsistent caching, and missing debouncing.

**Current State:**
- AdminDashboard: 7+ API calls on load
- TransactionsPage: 3-4 API calls on load
- SettingsPage: 3 API calls on load
- Total initial page renders can trigger 15-20+ requests

**Target State:**
- Reduce API calls by 60-70%
- Sub-2-second page load times
- Consistent caching strategy across the app

---

## Phase 1: Quick Wins (Low Effort, High Impact) ✅ COMPLETED

**Status:** IMPLEMENTED on January 14, 2026
**Estimated Complexity:** Low
**Files Modified:** 7 files

### 1.1 Axios Request Deduplication

**Problem:** Same endpoint called simultaneously from multiple components results in duplicate network requests.

**Solution:** Add request deduplication at the axios interceptor level.

**File:** `frontend/src/utils/axiosInterceptor.js`

```javascript
// Add to existing interceptor
const pendingRequests = new Map();

const generateRequestKey = (config) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

api.interceptors.request.use((config) => {
  const requestKey = generateRequestKey(config);

  // If identical request is pending, return the existing promise
  if (pendingRequests.has(requestKey)) {
    const controller = new AbortController();
    config.signal = controller.signal;
    controller.abort('Duplicate request cancelled');
    return config;
  }

  // Store pending request
  pendingRequests.set(requestKey, true);
  config._requestKey = requestKey;

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config._requestKey) {
      pendingRequests.delete(response.config._requestKey);
    }
    return response;
  },
  (error) => {
    if (error.config?._requestKey) {
      pendingRequests.delete(error.config._requestKey);
    }
    return Promise.reject(error);
  }
);
```

**Impact:** Eliminates duplicate simultaneous requests across all components.

---

### 1.2 Add Debouncing to All Filter Components

**Problem:** Filter changes trigger immediate API calls, causing multiple requests during rapid user input.

**Good Example (Already Implemented):** `frontend/src/hooks/useFees.js` uses 300ms debounce.

**Files Needing Debounce:**

| File | Current Behavior | Fix |
|------|------------------|-----|
| `frontend/src/components/common/filters/FilterBar.js` | Immediate onChange | Add 300ms debounce |
| `frontend/src/components/transactions/TransactionFilters.js` | Immediate onChange | Add 300ms debounce |
| `frontend/src/components/settings/UserFilterBar.js` | Immediate onChange | Add 300ms debounce |
| `frontend/src/pages/FeePage.js` | Filter triggers fetch | Add 300ms debounce |
| `frontend/src/pages/TransactionsPage.js` | Filter triggers fetch | Add 300ms debounce |

**Implementation Pattern:**

```javascript
// Create a reusable debounce hook
// File: frontend/src/hooks/useDebounce.js

import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Usage in components:
const debouncedFilters = useDebounce(filters, 300);

useEffect(() => {
  fetchData();
}, [debouncedFilters]); // Only fetches after 300ms of no changes
```

**Impact:** Reduces filter-triggered API calls by 80-90%.

---

### 1.3 Lazy Load Non-Critical Data

**Problem:** All data loads upfront, blocking initial render.

**Solution:** Load critical data first, defer charts/stats/heavy data.

**Files to Modify:**

| Page | Critical Data | Defer Loading |
|------|---------------|---------------|
| `AdminDashboard.js` | User info, navigation | Charts, stats, recent registrations |
| `FinanceDashboard.js` | Summary cards | Monthly trends chart, cash flow chart |
| `InventoryDashboard.js` | Inventory list | Charts, statistics |
| `TransactionsPage.js` | Transaction list | Stats, charts |

**Implementation Pattern:**

```javascript
// In AdminDashboard.js
const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);

useEffect(() => {
  // Load critical data first
  await fetchCriticalData();
  setCriticalDataLoaded(true);
}, []);

useEffect(() => {
  // Load secondary data after critical data
  if (criticalDataLoaded) {
    fetchCharts();
    fetchStats();
    fetchRecentRegistrations();
  }
}, [criticalDataLoaded]);
```

**Impact:** 40-50% faster perceived page load.

---

## Phase 2: Structural Improvements (Medium Effort, High Impact)

**Estimated Complexity:** Medium
**Files to Modify:** 15-25 files

### 2.1 Implement React Query

**Problem:** Fragmented caching (Context, useCache, inline managers, no caching) creates inconsistency.

**Solution:** Replace all caching mechanisms with React Query (TanStack Query).

**Installation:**

```bash
cd frontend
npm install @tanstack/react-query
```

**Setup:**

```javascript
// File: frontend/src/index.js or App.js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (matches current useCache TTL)
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* existing app */}
    </QueryClientProvider>
  );
}
```

**Migration Examples:**

#### Before (Current Pattern):
```javascript
// In StudentsPage.js
const [students, setStudents] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchStudents = async () => {
    setLoading(true);
    const response = await axios.get('/api/students/');
    setStudents(response.data);
    setLoading(false);
  };
  fetchStudents();
}, []);
```

#### After (React Query):
```javascript
// In StudentsPage.js
import { useQuery } from '@tanstack/react-query';

const { data: students = [], isLoading } = useQuery({
  queryKey: ['students'],
  queryFn: () => axios.get('/api/students/').then(res => res.data),
});
```

**Benefits:**
- Automatic request deduplication
- Built-in caching with configurable TTL
- Background refetching
- Loading/error states
- DevTools for debugging

**Files to Migrate:**

| Priority | File | Current Calls | React Query Hooks |
|----------|------|---------------|-------------------|
| High | `StudentsPage.js` | 2 | `useStudents`, `useClasses` |
| High | `TransactionsPage.js` | 4 | `useTransactions`, `useAccounts`, `useCategories` |
| High | `AdminDashboard.js` | 7 | `useDashboardStats`, `useRecentRegistrations` |
| High | `SettingsPage.js` | 3 | `useUsers`, `useRoles`, `useStats` |
| Medium | `FeePage.js` | 3 | `useFees`, `useSchools` |
| Medium | `FinanceDashboard.js` | 2 | `useFinanceSummary`, `useMonthlyTrends` |
| Medium | `InventoryPage.js` | 7 | `useInventory`, `useInventoryStats` |
| Low | `LessonsPage.js` | 3 | `useLessons` |
| Low | `ProgressPage.js` | 4 | `useProgress` |

---

### 2.2 Create Custom React Query Hooks

**File Structure:**

```
frontend/src/hooks/queries/
├── useStudents.js
├── useTransactions.js
├── useDashboard.js
├── useFinance.js
├── useInventory.js
├── useUsers.js
├── useFees.js
└── index.js
```

**Example Hook:**

```javascript
// File: frontend/src/hooks/queries/useStudents.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../../api/services/studentService';

export const useStudents = (filters = {}) => {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentService.getStudents(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudent = (id) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudent(id),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentService.createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};
```

---

### 2.3 Consolidate API Service Files

**Problem:** Duplicate services in `/api/services/` and `/services/` directories.

**Current Structure:**
```
frontend/src/
├── api/
│   ├── services/
│   │   ├── crmService.js
│   │   ├── schoolService.js
│   │   ├── studentService.js
│   │   └── transactionService.js
│   └── api.js
└── services/
    ├── adminService.js
    ├── userService.js
    ├── feeService.js
    ├── teacherService.js
    ├── attendanceService.js
    └── reportService.js
```

**Target Structure:**
```
frontend/src/
└── services/
    ├── index.js          # Re-exports all services
    ├── api.js            # Axios instance config
    ├── adminService.js
    ├── attendanceService.js
    ├── crmService.js
    ├── feeService.js
    ├── inventoryService.js
    ├── reportService.js
    ├── schoolService.js
    ├── studentService.js
    ├── teacherService.js
    ├── transactionService.js
    └── userService.js
```

**Migration Steps:**
1. Audit both directories for overlapping functionality
2. Merge duplicate services, keeping the most complete version
3. Update all imports across the codebase
4. Delete `/api/services/` directory
5. Update `/api/api.js` to just export axios instance

---

### 2.4 Standardize Context Usage

**Keep These Contexts (Global App State):**
- `UserContext` - Current user authentication
- `SchoolsContext` - School list (rarely changes)
- `ThemeContext` - UI preferences

**Remove/Replace These (Use React Query Instead):**
- `BooksContext` - Migrate to `useBooks()` query hook
- `ClassesContext` - Migrate to `useClasses()` query hook
- Any data that changes frequently or is page-specific

---

## Phase 3: Backend Optimizations (High Effort, Highest Impact)

**Estimated Complexity:** High
**Files to Modify:** Backend views + Frontend pages

### 3.1 Create Combined/Batch API Endpoints

**Problem:** Pages make 5-10 separate API calls to render. Each call has network overhead.

**Solution:** Create combined endpoints that return all data needed for a page in one request.

**New Endpoints to Create:**

#### 3.1.1 Dashboard Summary Endpoint

```python
# File: backend/dashboard/views.py

class DashboardSummaryView(APIView):
    """
    Returns all dashboard data in a single response.
    Replaces 7+ individual API calls.
    """

    def get(self, request):
        user = request.user
        school_id = request.query_params.get('school_id')

        return Response({
            'stats': {
                'total_students': Student.objects.filter(...).count(),
                'total_teachers': Teacher.objects.filter(...).count(),
                'total_revenue': Transaction.objects.filter(...).aggregate(...),
                'pending_fees': Fee.objects.filter(...).aggregate(...),
            },
            'recent_registrations': StudentSerializer(
                Student.objects.order_by('-created_at')[:10],
                many=True
            ).data,
            'upcoming_events': EventSerializer(
                Event.objects.filter(date__gte=today)[:5],
                many=True
            ).data,
            'notifications': NotificationSerializer(
                Notification.objects.filter(user=user)[:10],
                many=True
            ).data,
        })
```

**URL:** `GET /api/dashboard/summary/`

**Frontend Usage:**
```javascript
// Before: 7 separate calls
const stats = await axios.get('/api/stats/');
const students = await axios.get('/api/students/recent/');
const events = await axios.get('/api/events/upcoming/');
// ... 4 more calls

// After: 1 combined call
const { data } = await axios.get('/api/dashboard/summary/');
// data.stats, data.recent_registrations, data.upcoming_events, etc.
```

---

#### 3.1.2 Transactions Page Endpoint

```python
# File: backend/transactions/views.py

class TransactionsPageDataView(APIView):
    """
    Returns all data needed for transactions page.
    Replaces 4 individual API calls.
    """

    def get(self, request):
        return Response({
            'schools': SchoolSerializer(
                School.objects.all(),
                many=True
            ).data,
            'accounts': AccountSerializer(
                Account.objects.all(),
                many=True
            ).data,
            'categories': {
                'income': CategorySerializer(
                    Category.objects.filter(type='income'),
                    many=True
                ).data,
                'expense': CategorySerializer(
                    Category.objects.filter(type='expense'),
                    many=True
                ).data,
            },
            'recent_transactions': TransactionSerializer(
                Transaction.objects.order_by('-date')[:50],
                many=True
            ).data,
        })
```

**URL:** `GET /api/transactions/page-data/`

---

#### 3.1.3 Finance Dashboard Endpoint

```python
# File: backend/finance/views.py

class FinanceDashboardView(APIView):
    """
    Returns all finance dashboard data.
    Replaces 3-4 individual API calls.
    """

    def get(self, request):
        school_id = request.query_params.get('school_id')
        date_range = request.query_params.get('range', '30')  # days

        return Response({
            'summary': {
                'total_income': ...,
                'total_expense': ...,
                'net_balance': ...,
                'pending_fees': ...,
            },
            'monthly_trends': [...],  # Last 12 months
            'cash_flow': [...],       # Daily for selected range
            'top_categories': [...],  # Top 5 income/expense categories
        })
```

**URL:** `GET /api/finance/dashboard/`

---

### 3.2 Implement Server-Side Pagination

**Problem:** Some endpoints return ALL records, causing slow responses.

**Files to Update:**

| Endpoint | Current | Target |
|----------|---------|--------|
| `/api/students/` | Returns all | Paginate (50/page) |
| `/api/transactions/` | Returns all | Paginate (50/page) |
| `/api/inventory/` | Returns all | Paginate (100/page) |
| `/api/fees/` | Returns all | Paginate (50/page) |

**Backend Implementation:**

```python
# File: backend/core/pagination.py
from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

# Usage in views.py
class StudentViewSet(viewsets.ModelViewSet):
    pagination_class = StandardPagination
```

**Frontend Implementation:**

```javascript
// With React Query
const useStudents = (page = 1, pageSize = 50) => {
  return useQuery({
    queryKey: ['students', page, pageSize],
    queryFn: () => axios.get(`/api/students/?page=${page}&page_size=${pageSize}`),
    keepPreviousData: true, // Smooth pagination transitions
  });
};
```

---

### 3.3 Add Database Query Optimization

**Problem:** N+1 queries in serializers cause slow API responses.

**Solution:** Use `select_related` and `prefetch_related`.

**Example Fix:**

```python
# Before (N+1 queries)
class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()

# After (Optimized)
class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related(
        'school',
        'class_assigned',
        'created_by'
    ).prefetch_related(
        'fees',
        'attendance_records'
    )
```

**Files to Audit:**
- `backend/students/views.py`
- `backend/transactions/views.py`
- `backend/fees/views.py`
- `backend/inventory/views.py`

---

### 3.4 Implement Redis Caching (Backend)

**Problem:** Frequently accessed data (schools, categories, classes) hits database on every request.

**Solution:** Cache stable data in Redis.

**Installation:**

```bash
pip install django-redis
```

**Configuration:**

```python
# File: backend/settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 300,  # 5 minutes default
    }
}
```

**Usage:**

```python
from django.core.cache import cache

class SchoolViewSet(viewsets.ModelViewSet):
    def list(self, request):
        cache_key = 'schools_list'
        schools = cache.get(cache_key)

        if schools is None:
            schools = list(School.objects.all().values())
            cache.set(cache_key, schools, timeout=600)  # 10 minutes

        return Response(schools)
```

**Data to Cache:**
| Data | Cache Duration | Invalidation Trigger |
|------|----------------|---------------------|
| Schools list | 10 minutes | School CRUD |
| Categories | 30 minutes | Category CRUD |
| Classes | 10 minutes | Class CRUD |
| User permissions | 5 minutes | Permission change |

---

## Implementation Checklist

### Phase 1 Checklist ✅ COMPLETED
- [ ] ~~Add axios request deduplication to `axiosInterceptor.js`~~ (DISABLED - causes issues without promise sharing; will be properly implemented with React Query in Phase 2)
- [x] Create `useDebounce` hook (`frontend/src/hooks/useDebounce.js`)
- [x] Add debounce to `FilterBar.js`
- [x] Add debounce to `TransactionFilters.js`
- [x] Add debounce to `UserFilterBar.js`
- [ ] Add debounce to `FeePage.js` (already uses useFees hook with debounce)
- [ ] Add debounce to `TransactionsPage.js` (uses manual Search button)
- [x] Implement lazy loading in `AdminDashboard.js` (was already implemented)
- [x] Implement lazy loading in `FinanceDashboard.js`
- [ ] Test and measure performance improvement

### Phase 2 Checklist
- [ ] Install React Query
- [ ] Set up QueryClientProvider in App.js
- [ ] Create query hooks directory structure
- [ ] Migrate `StudentsPage.js` to React Query
- [ ] Migrate `TransactionsPage.js` to React Query
- [ ] Migrate `AdminDashboard.js` to React Query
- [ ] Migrate `SettingsPage.js` to React Query
- [ ] Migrate remaining pages
- [ ] Consolidate service files
- [ ] Remove duplicate `/api/services/` directory
- [ ] Update all imports
- [ ] Remove unused Context providers
- [ ] Test and measure performance improvement

### Phase 3 Checklist ✅ COMPLETED (January 14, 2026)
- [x] Create `DashboardSummaryView` endpoint (`/api/dashboards/admin-summary/`)
- [x] Create `TransactionsPageDataView` endpoint (`/api/dashboards/transactions-page-data/`)
- [x] Create `FinanceDashboardView` endpoint (`/api/dashboards/finance-dashboard/`)
- [x] Create `StudentsDashboardView` endpoint (`/api/dashboards/students-page-data/`)
- [x] Update frontend to use combined endpoints (React Query hooks added)
- [x] Implement pagination on `/api/students/` (StandardPagination - 50 per page)
- [x] Implement pagination on `/api/transactions/` (LimitOffsetPagination - already existed)
- [x] Implement pagination on `/api/inventory/` (LargePagination - 100 per page)
- [x] Add `select_related` to Student queries (StudentViewSet.get_queryset)
- [x] Fixed N+1 query in `students_per_school` endpoint
- [x] Set up Redis configuration (with database cache fallback)
- [x] Implement caching for schools, categories, accounts (cache_helpers.py)
- [x] Add cache invalidation framework (invalidate_*_cache functions)
- [ ] Test and measure performance improvement (pending verification)

---

## Expected Results

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 |
|--------|---------|---------------|---------------|---------------|
| API calls per page load | 5-10 | 3-5 | 2-3 | 1-2 |
| Duplicate requests | Many | None | None | None |
| Cache hit rate | ~20% | ~40% | ~70% | ~90% |
| Average page load | 3-5s | 2-3s | 1-2s | <1s |
| Time to interactive | 4-6s | 2-4s | 1-2s | <1s |

---

## Monitoring & Measurement

### Tools to Use
1. **Browser DevTools Network Tab** - Count requests, measure timing
2. **React Query DevTools** - Monitor cache status, stale queries
3. **Django Debug Toolbar** - Database query analysis
4. **Lighthouse** - Overall performance scoring

### Key Metrics to Track
- Number of API calls per page load
- Time to First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- API response times (p50, p95)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| React Query migration breaks existing functionality | Migrate one page at a time, keep old hooks as fallback |
| Combined endpoints return too much data | Add query params to request only needed sections |
| Redis cache gets stale | Implement proper cache invalidation on all CRUD operations |
| Pagination breaks existing UI | Implement infinite scroll or "Load More" pattern |

---

## Appendix: File Reference

### Frontend Files to Modify

**Phase 1:**
- `frontend/src/utils/axiosInterceptor.js`
- `frontend/src/hooks/useDebounce.js` (new)
- `frontend/src/components/common/filters/FilterBar.js`
- `frontend/src/components/transactions/TransactionFilters.js`
- `frontend/src/components/settings/UserFilterBar.js`
- `frontend/src/pages/AdminDashboard.js`
- `frontend/src/pages/FinanceDashboard.js`

**Phase 2:**
- `frontend/src/App.js`
- `frontend/src/hooks/queries/*.js` (new directory)
- All page files in `frontend/src/pages/`
- `frontend/src/services/` (consolidation)

**Phase 3:**
- Frontend pages using new combined endpoints

### Backend Files to Modify

**Phase 3:**
- `backend/dashboard/views.py` (new or modify)
- `backend/transactions/views.py`
- `backend/finance/views.py`
- `backend/students/views.py`
- `backend/core/pagination.py` (new)
- `backend/settings.py` (Redis config)

---

*Document created: January 2026*
*Last updated: January 2026*
