'use client';

import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { MonthNavigator } from '@/components/month-navigator';
import { Card, buttonClassName } from '@/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/components/data-states';
import type { BudgetWorkspaceCategory, BudgetWorkspaceGroup, BudgetWorkspaceResponse } from '@/lib/services/budgetWorkspaceService';

type WorkspaceState = BudgetWorkspaceResponse;

export type WorkspaceFilter = 'all' | 'underfunded' | 'overfunded' | 'snoozed';

const filterTabs: Array<{ key: WorkspaceFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'underfunded', label: 'Underfunded' },
  { key: 'overfunded', label: 'Overfunded' },
  { key: 'snoozed', label: 'Snoozed' },
];

const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toAssignedDraftMap = (groups: BudgetWorkspaceGroup[]): Record<string, string> => {
  const drafts: Record<string, string> = {};
  groups.forEach((group) => {
    group.categories.forEach((category) => {
      drafts[category.id] = category.assigned.toFixed(2);
    });
  });
  return drafts;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const isUnderfunded = (category: BudgetWorkspaceCategory): boolean => {
  if (category.goal && category.goal.target_amount > 0) {
    return category.available < category.goal.target_amount;
  }
  return category.available < 0;
};

export const isOverfunded = (category: BudgetWorkspaceCategory): boolean => {
  if (category.goal && category.goal.target_amount > 0) {
    return category.available > category.goal.target_amount;
  }
  return category.available > 0 && category.assigned > 0;
};

export const isSnoozed = (category: BudgetWorkspaceCategory): boolean => {
  if (!category.goal) return false;
  return category.goal.cadence === '' && category.goal.target_date === '';
};

export const categoryMatchesFilter = (category: BudgetWorkspaceCategory, filter: WorkspaceFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'underfunded') return isUnderfunded(category);
  if (filter === 'overfunded') return isOverfunded(category);
  return isSnoozed(category);
};

export function BudgetWorkspaceShell() {
  const searchParams = useSearchParams();
  const initialMonthKey =
    searchParams.get('month_key') ?? format(new Date(), 'yyyy-MM');

  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<WorkspaceFilter>('all');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [assignedDrafts, setAssignedDrafts] = useState<Record<string, string>>({});
  const [savingAssignedId, setSavingAssignedId] = useState<string | null>(null);

  const [isCreateBucketOpen, setCreateBucketOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketError, setNewBucketError] = useState('');
  const [isCreatingBucket, setCreatingBucket] = useState(false);
  const [bucketEditGroupId, setBucketEditGroupId] = useState<string | null>(null);
  const [bucketEditName, setBucketEditName] = useState('');
  const [bucketEditError, setBucketEditError] = useState('');
  const [isSavingBucketEdit, setSavingBucketEdit] = useState(false);
  const [bucketDeleteGroupId, setBucketDeleteGroupId] = useState<string | null>(null);
  const [bucketDeleteError, setBucketDeleteError] = useState('');
  const [isDeletingBucket, setDeletingBucket] = useState(false);
  const bucketEditPopoverRef = useRef<HTMLDivElement | null>(null);
  const categoryEditPopoverRef = useRef<HTMLDivElement | null>(null);

  const [categoryCreateGroupId, setCategoryCreateGroupId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState('');
  const [isCreatingCategory, setCreatingCategory] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categoryEditGroupId, setCategoryEditGroupId] = useState<string | null>(null);
  const [categoryEditName, setCategoryEditName] = useState('');
  const [categoryEditError, setCategoryEditError] = useState('');
  const [isSavingCategoryEdit, setSavingCategoryEdit] = useState(false);
  const [categoryDeleteId, setCategoryDeleteId] = useState<string | null>(null);
  const [categoryDeleteError, setCategoryDeleteError] = useState('');
  const [isDeletingCategory, setDeletingCategory] = useState(false);
  const [useMobileCategorySheet, setUseMobileCategorySheet] = useState(false);
  const [isTargetEditorOpen, setTargetEditorOpen] = useState(false);
  const [targetAmountDraft, setTargetAmountDraft] = useState('0.00');
  const [isTargetIndefinite, setTargetIndefinite] = useState(false);
  const [targetCadenceDraft, setTargetCadenceDraft] = useState('');
  const [targetDateDraft, setTargetDateDraft] = useState('');
  const [targetFormError, setTargetFormError] = useState('');
  const [isSavingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/budget-workspace?month_key=${monthKey}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load budget workspace'))))
      .then((result: WorkspaceState) => {
        setData(result);
        setError('');
        setAssignedDrafts(toAssignedDraftMap(result.groups));
        setSelectedCategoryId((previousSelectedCategoryId) => {
          if (previousSelectedCategoryId) {
            const stillExists = result.groups.some((group) =>
              group.categories.some((category) => category.id === previousSelectedCategoryId),
            );
            if (stillExists) {
              return previousSelectedCategoryId;
            }
          }
          return result.groups[0]?.categories[0]?.id ?? null;
        });
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [monthKey]);

  const startCreateCategory = (groupId: string, mobile: boolean) => {
    setCategoryCreateGroupId(groupId);
    setUseMobileCategorySheet(mobile);
    setNewCategoryName('');
    setNewCategoryError('');
  };

  const handleAssignedChange = async (categoryId: string) => {
    if (!data) return;
    const category = data.groups.flatMap((group) => group.categories).find((item) => item.id === categoryId);
    if (!category) return;
    const draftValue = assignedDrafts[categoryId] ?? category.assigned.toFixed(2);
    const parsed = Number.parseFloat(draftValue);
    if (Number.isNaN(parsed)) {
      setAssignedDrafts((previous) => ({ ...previous, [categoryId]: category.assigned.toFixed(2) }));
      return;
    }
    const previousData = data;
    const amount = Number(parsed.toFixed(2));
    if (amount === category.assigned) {
      setAssignedDrafts((previous) => ({ ...previous, [categoryId]: amount.toFixed(2) }));
      return;
    }
    setSavingAssignedId(categoryId);
    const delta = amount - category.assigned;

    const optimistic: WorkspaceState = {
      ...previousData,
      summary: {
        ...previousData.summary,
        assigned_total: previousData.summary.assigned_total + delta,
        available_total: previousData.summary.available_total + delta,
        ready_to_assign: previousData.summary.ready_to_assign - delta,
      },
      groups: previousData.groups.map((group) => ({
        ...group,
        categories: group.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                assigned: amount,
                available: category.available + delta,
              }
            : category,
        ),
      })),
    };
    setData(optimistic);
    setAssignedDrafts((previous) => ({ ...previous, [categoryId]: amount.toFixed(2) }));

    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_assigned',
          category_id: categoryId,
          month_key: monthKey,
          assigned_amount: amount,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update assigned');
      }
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update assigned');
      setData(previousData);
      setAssignedDrafts((previous) => ({ ...previous, [categoryId]: category.assigned.toFixed(2) }));
    } finally {
      setSavingAssignedId(null);
    }
  };

  const handleCreateBucket = async () => {
    if (!data) return;
    const name = newBucketName.trim();
    if (!name) {
      setNewBucketError('Bucket name is required.');
      return;
    }
    const duplicate = data.groups.some((group) => normalize(group.name) === normalize(name));
    if (duplicate) {
      setNewBucketError('Bucket name already exists.');
      return;
    }

    setCreatingBucket(true);
    setNewBucketError('');
    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_group',
          name,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create bucket');
      }
      const result = await response.json();
      const group = result.group as BudgetWorkspaceGroup;
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: [...previous.groups, { ...group, categories: [] }],
        };
      });
      setCollapsedGroupIds((previous) => previous.filter((id) => id !== group.id));
      setNewBucketName('');
      setCreateBucketOpen(false);
    } catch (createError: unknown) {
      setNewBucketError(createError instanceof Error ? createError.message : 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!data || !categoryCreateGroupId) return;
    const name = newCategoryName.trim();
    if (!name) {
      setNewCategoryError('Bucket list name is required.');
      return;
    }
    const parentGroup = data.groups.find((group) => group.id === categoryCreateGroupId);
    if (!parentGroup) {
      setNewCategoryError('Bucket was not found.');
      return;
    }
    const duplicate = parentGroup.categories.some((category) => normalize(category.name) === normalize(name));
    if (duplicate) {
      setNewCategoryError('Bucket list name already exists in this bucket.');
      return;
    }

    setCreatingCategory(true);
    setNewCategoryError('');
    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_category',
          group_id: categoryCreateGroupId,
          name,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create bucket list');
      }
      const result = await response.json();
      const newCategory = result.category as BudgetWorkspaceCategory;
      const workspaceCategory: BudgetWorkspaceCategory = {
        ...newCategory,
        assigned: 0,
        activity: 0,
        available: 0,
        goal: null,
      };
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: previous.groups.map((group) =>
            group.id === categoryCreateGroupId
              ? {
                  ...group,
                  categories: [...group.categories, workspaceCategory],
                }
              : group,
          ),
        };
      });
      setAssignedDrafts((previous) => ({ ...previous, [workspaceCategory.id]: '0.00' }));
      setCollapsedGroupIds((previous) => previous.filter((id) => id !== categoryCreateGroupId));
      setSelectedCategoryId(workspaceCategory.id);
      setDetailsCollapsed(false);
      setCategoryCreateGroupId(null);
      setNewCategoryName('');
      setUseMobileCategorySheet(false);
    } catch (createError: unknown) {
      setNewCategoryError(createError instanceof Error ? createError.message : 'Failed to create bucket list');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openCategoryRename = (category: BudgetWorkspaceCategory) => {
    closeBucketRename();
    setCategoryEditId(category.id);
    setCategoryEditGroupId(category.group_id);
    setCategoryEditName(category.name);
    setCategoryEditError('');
    setCategoryDeleteId(null);
    setCategoryDeleteError('');
    setDeletingCategory(false);
  };

  const closeCategoryRename = () => {
    setCategoryEditId(null);
    setCategoryEditGroupId(null);
    setCategoryEditName('');
    setCategoryEditError('');
    setCategoryDeleteId(null);
    setCategoryDeleteError('');
    setDeletingCategory(false);
    setSavingCategoryEdit(false);
  };

  const handleRenameCategory = async () => {
    if (!data || !categoryEditId || !categoryEditGroupId) return;
    const name = categoryEditName.trim();
    if (!name) {
      setCategoryEditError('Bucket list name is required.');
      return;
    }
    const parentGroup = data.groups.find((group) => group.id === categoryEditGroupId);
    if (!parentGroup) {
      setCategoryEditError('Bucket was not found.');
      return;
    }
    const duplicate = parentGroup.categories.some(
      (category) => category.id !== categoryEditId && normalize(category.name) === normalize(name),
    );
    if (duplicate) {
      setCategoryEditError('Bucket list name already exists in this bucket.');
      return;
    }

    setSavingCategoryEdit(true);
    setCategoryEditError('');
    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rename_category',
          category_id: categoryEditId,
          name,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to rename bucket list');
      }
      const result = await response.json();
      const updatedCategory = result.category as BudgetWorkspaceCategory;
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: previous.groups.map((group) => ({
            ...group,
            categories: group.categories.map((category) =>
              category.id === categoryEditId ? { ...category, name: updatedCategory.name } : category,
            ),
          })),
        };
      });
      closeCategoryRename();
    } catch (renameError: unknown) {
      setCategoryEditError(renameError instanceof Error ? renameError.message : 'Failed to rename bucket list');
      setSavingCategoryEdit(false);
    }
  };

  const openBucketRename = (group: BudgetWorkspaceGroup) => {
    closeCategoryRename();
    setBucketEditGroupId(group.id);
    setBucketEditName(group.name);
    setBucketEditError('');
    setBucketDeleteGroupId(null);
    setBucketDeleteError('');
    setDeletingBucket(false);
  };

  const closeBucketRename = () => {
    setBucketEditGroupId(null);
    setBucketEditName('');
    setBucketEditError('');
    setBucketDeleteGroupId(null);
    setBucketDeleteError('');
    setDeletingBucket(false);
    setSavingBucketEdit(false);
  };

  const closeBucketDeleteDialog = () => {
    setBucketDeleteGroupId(null);
    setBucketDeleteError('');
    setDeletingBucket(false);
  };

  const handleRenameBucket = async () => {
    if (!data || !bucketEditGroupId) return;
    const name = bucketEditName.trim();
    if (!name) {
      setBucketEditError('Bucket name is required.');
      return;
    }
    const duplicate = data.groups.some(
      (group) => group.id !== bucketEditGroupId && normalize(group.name) === normalize(name),
    );
    if (duplicate) {
      setBucketEditError('Bucket name already exists.');
      return;
    }

    setSavingBucketEdit(true);
    setBucketEditError('');
    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rename_group',
          group_id: bucketEditGroupId,
          name,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to rename bucket');
      }
      const result = await response.json();
      const updatedGroup = result.group as BudgetWorkspaceGroup;
      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: previous.groups.map((group) => (group.id === bucketEditGroupId ? { ...group, name: updatedGroup.name } : group)),
        };
      });
      closeBucketRename();
    } catch (renameError: unknown) {
      setBucketEditError(renameError instanceof Error ? renameError.message : 'Failed to rename bucket');
      setSavingBucketEdit(false);
    }
  };

  const handleDeleteBucket = async () => {
    if (!data || !bucketDeleteGroupId) return;
    setDeletingBucket(true);
    setBucketDeleteError('');
    try {
      const response = await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_group',
          group_id: bucketDeleteGroupId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete bucket');
      }

      const deletedCategoryIds = new Set(
        data.groups
          .find((group) => group.id === bucketDeleteGroupId)
          ?.categories.map((category) => category.id) ?? [],
      );

      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: previous.groups.filter((group) => group.id !== bucketDeleteGroupId),
        };
      });
      setCollapsedGroupIds((previous) => previous.filter((id) => id !== bucketDeleteGroupId));
      setAssignedDrafts((previous) => {
        const next = { ...previous };
        deletedCategoryIds.forEach((categoryId) => {
          delete next[categoryId];
        });
        return next;
      });
      setSelectedCategoryId((previousSelectedCategoryId) => {
        if (!previousSelectedCategoryId) return previousSelectedCategoryId;
        if (!deletedCategoryIds.has(previousSelectedCategoryId)) return previousSelectedCategoryId;
        const remainingGroups = data.groups.filter((group) => group.id !== bucketDeleteGroupId);
        return remainingGroups[0]?.categories[0]?.id ?? null;
      });
      closeBucketRename();
      closeBucketDeleteDialog();
    } catch (deleteError: unknown) {
      setBucketDeleteError(deleteError instanceof Error ? deleteError.message : 'Failed to delete bucket');
      setDeletingBucket(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!data || !categoryDeleteId) return;
    setDeletingCategory(true);
    setCategoryDeleteError('');
    try {
      const response = await fetch(`/api/budgets/${categoryDeleteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete bucket list');
      }

      setData((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          groups: previous.groups.map((group) => ({
            ...group,
            categories: group.categories.filter((category) => category.id !== categoryDeleteId),
          })),
        };
      });
      setAssignedDrafts((previous) => {
        const next = { ...previous };
        delete next[categoryDeleteId];
        return next;
      });
      setSelectedCategoryId((previousSelectedCategoryId) => {
        if (previousSelectedCategoryId !== categoryDeleteId) return previousSelectedCategoryId;
        const fallbackCategoryId =
          data.groups
            .flatMap((group) => group.categories)
            .find((category) => category.id !== categoryDeleteId)?.id ?? null;
        return fallbackCategoryId;
      });
      closeCategoryRename();
    } catch (deleteError: unknown) {
      setCategoryDeleteError(deleteError instanceof Error ? deleteError.message : 'Failed to delete bucket list');
      setDeletingCategory(false);
    }
  };

  useEffect(() => {
    if (!bucketEditGroupId) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (bucketEditPopoverRef.current && !bucketEditPopoverRef.current.contains(event.target as Node)) {
        setBucketEditGroupId(null);
        setBucketEditName('');
        setBucketEditError('');
        setBucketDeleteGroupId(null);
        setBucketDeleteError('');
        setDeletingBucket(false);
        setSavingBucketEdit(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bucketEditGroupId]);

  useEffect(() => {
    if (!categoryEditId) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryEditPopoverRef.current && !categoryEditPopoverRef.current.contains(event.target as Node)) {
        setCategoryEditId(null);
        setCategoryEditGroupId(null);
        setCategoryEditName('');
        setCategoryEditError('');
        setCategoryDeleteId(null);
        setCategoryDeleteError('');
        setDeletingCategory(false);
        setSavingCategoryEdit(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categoryEditId]);

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    return data.groups
      .map((group) => {
        const totals = group.categories.reduce(
          (result, category) => ({
            allocated: result.allocated + category.assigned,
            spent: result.spent + category.activity,
            balance: result.balance + category.available,
          }),
          { allocated: 0, spent: 0, balance: 0 },
        );
        return {
          ...group,
          categories: group.categories.filter((category) => categoryMatchesFilter(category, activeFilter)),
          totals,
        };
      })
      .filter((group) => group.categories.length > 0 || activeFilter === 'all');
  }, [activeFilter, data]);

  const filterCounts = useMemo(() => {
    if (!data) {
      return { all: 0, underfunded: 0, overfunded: 0, snoozed: 0 };
    }
    const categories = data.groups.flatMap((group) => group.categories);
    return {
      all: categories.length,
      underfunded: categories.filter(isUnderfunded).length,
      overfunded: categories.filter(isOverfunded).length,
      snoozed: categories.filter(isSnoozed).length,
    };
  }, [data]);

  const selectedCategory: BudgetWorkspaceCategory | undefined = useMemo(() => {
    if (!data || !selectedCategoryId) return undefined;
    for (const group of data.groups) {
      const match = group.categories.find((category) => category.id === selectedCategoryId);
      if (match) return match;
    }
    return undefined;
  }, [data, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategory) {
      setTargetEditorOpen(false);
      setTargetAmountDraft('0.00');
      setTargetIndefinite(false);
      setTargetCadenceDraft('');
      setTargetDateDraft('');
      setTargetFormError('');
      return;
    }
    setTargetEditorOpen(false);
    setTargetAmountDraft((selectedCategory.goal?.target_amount ?? 0).toFixed(2));
    setTargetIndefinite(
      selectedCategory.goal ? selectedCategory.goal.goal_type === 'monthly_savings' || !selectedCategory.goal.target_date : false,
    );
    setTargetCadenceDraft(selectedCategory.goal?.cadence ?? '');
    setTargetDateDraft(selectedCategory.goal?.target_date ?? '');
    setTargetFormError('');
  }, [selectedCategory]);

  const refreshWorkspace = async () => {
    const response = await fetch(`/api/budget-workspace?month_key=${monthKey}`);
    if (!response.ok) {
      throw new Error('Failed to refresh budget workspace');
    }
    const result = (await response.json()) as WorkspaceState;
    setData(result);
    setAssignedDrafts(toAssignedDraftMap(result.groups));
    setSelectedCategoryId((previousSelectedCategoryId) => {
      if (previousSelectedCategoryId) {
        const stillExists = result.groups.some((group) =>
          group.categories.some((category) => category.id === previousSelectedCategoryId),
        );
        if (stillExists) {
          return previousSelectedCategoryId;
        }
      }
      return result.groups[0]?.categories[0]?.id ?? null;
    });
  };

  const handleTargetSave = async () => {
    if (!selectedCategory) return;
    const parsedTargetAmount = Number.parseFloat(targetAmountDraft);
    if (Number.isNaN(parsedTargetAmount) || parsedTargetAmount < 0) {
      setTargetFormError('Target amount must be 0 or greater.');
      return;
    }
    if (!isTargetIndefinite && !targetDateDraft) {
      setTargetFormError('Target date is required when repeat is off.');
      return;
    }
    setSavingTarget(true);
    setTargetFormError('');
    try {
      const response = await fetch(`/api/budgets/${selectedCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budget_name: selectedCategory.name,
          target_amount: parsedTargetAmount,
          is_indefinite: isTargetIndefinite,
          cadence: isTargetIndefinite ? targetCadenceDraft : '',
          target_date: isTargetIndefinite ? '' : targetDateDraft,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: { message: 'Failed to update target' } }));
        throw new Error(result.error?.message ?? 'Failed to update target');
      }
      await refreshWorkspace();
      setTargetEditorOpen(false);
    } catch (saveError: unknown) {
      setTargetFormError(saveError instanceof Error ? saveError.message : 'Failed to update target');
    } finally {
      setSavingTarget(false);
    }
  };

  const summaryCard = useMemo(() => {
    const readyToAssign = data?.summary.ready_to_assign ?? 0;
    if (readyToAssign === 0) {
      return {
        title: 'All are assigned',
        value: formatCurrency(0),
        tone: 'text-foreground',
      };
    }
    if (readyToAssign > 0) {
      return {
        title: 'Ready to Assign',
        value: formatCurrency(readyToAssign),
        tone: 'text-foreground',
      };
    }
    return {
      title: 'Over assigned',
      value: formatCurrency(readyToAssign),
      tone: 'text-danger',
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-stretch">
        <Card className="space-y-2 py-2.5 md:py-3" dense>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Buckets</h1>
          <MonthNavigator monthKey={monthKey} onMonthKeyChange={setMonthKey} />
        </Card>
        <Card className="flex flex-col justify-center bg-brand-soft px-4 py-2.5 text-right" dense>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{summaryCard.title}</p>
          <div className="flex items-center justify-end gap-2">
            <p className={`text-xl font-semibold md:text-2xl ${summaryCard.tone}`}>{summaryCard.value}</p>
            {summaryCard.title === 'All are assigned' ? (
              <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-emerald-500 md:h-7 md:w-7" strokeWidth={2.25} />
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center gap-2 px-3 py-2.5 md:grid md:grid-cols-[auto_1fr_auto]" dense>
        <button
          className={buttonClassName({ size: 'sm' })}
          onClick={() => {
            setCreateBucketOpen(true);
            setNewBucketError('');
            setNewBucketName('');
          }}
          type="button"
        >
          + Add Bucket
        </button>

        <div className="flex flex-1 flex-wrap items-center gap-1 md:justify-center">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              className={buttonClassName({
                size: 'sm',
                variant: activeFilter === tab.key ? 'secondary' : 'ghost',
                className: 'h-8 px-2.5 text-xs',
              })}
              onClick={() => setActiveFilter(tab.key)}
              type="button"
            >
              {tab.label} ({filterCounts[tab.key]})
            </button>
          ))}
        </div>

        <button
          className={buttonClassName({
            size: 'sm',
            variant: 'secondary',
            className: 'h-8 px-2.5 text-xs',
          })}
          onClick={() => setDetailsCollapsed((previous) => !previous)}
          type="button"
        >
          {detailsCollapsed ? 'Expand Target' : 'Collapse Target'}
        </button>
      </Card>

      {loading ? <LoadingState label="Loading buckets workspace..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <>
          <div
            className={`grid flex-1 gap-4 ${
              detailsCollapsed ? 'md:grid-cols-1' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
            }`}
          >
            <Card className="flex min-h-[400px] flex-col overflow-hidden">
              {data.groups.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-6">
                  <EmptyState
                    title="No buckets yet"
                    description="Create your first bucket to start organizing bucket lists."
                    action={
                      <button
                        className={buttonClassName({ size: 'sm' })}
                        onClick={() => setCreateBucketOpen(true)}
                        type="button"
                      >
                        + Add Bucket
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="table-scroll flex-1 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2">Buckets</th>
                        <th className="px-2 py-2 text-right">Allocated</th>
                        <th className="px-2 py-2 text-right">Transactions</th>
                        <th className="px-2 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={4}>
                            No bucket lists match the active filter.
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((group) => {
                          const isCollapsed = collapsedGroupIds.includes(group.id);
                          return (
                            <Fragment key={group.id}>
                              <tr className="bg-muted/40">
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex items-center gap-1">
                                      <button
                                        aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                                        className={buttonClassName({
                                          variant: 'ghost',
                                          size: 'sm',
                                          className: 'h-7 w-7 px-0 text-muted-foreground hover:text-foreground',
                                        })}
                                        onClick={() =>
                                          setCollapsedGroupIds((previous) =>
                                            previous.includes(group.id)
                                              ? previous.filter((id) => id !== group.id)
                                              : [...previous, group.id],
                                          )
                                        }
                                        type="button"
                                      >
                                        {isCollapsed ? (
                                          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.75} />
                                        ) : (
                                          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.75} />
                                        )}
                                      </button>
                                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {group.name}
                                      </span>
                                      <button
                                        aria-label={`Rename ${group.name}`}
                                        className={buttonClassName({
                                          variant: 'ghost',
                                          size: 'sm',
                                          className: 'h-8 w-8 px-0 text-muted-foreground hover:text-foreground',
                                        })}
                                        onClick={() => openBucketRename(group)}
                                        type="button"
                                      >
                                        <Pencil aria-hidden="true" className="h-4 w-4" />
                                      </button>
                                      {bucketEditGroupId === group.id ? (
                                        <div
                                          className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(90vw,420px)] rounded-[var(--radius-md)] border border-surface-border bg-background p-2 shadow-lg"
                                          ref={bucketEditPopoverRef}
                                        >
                                          <div className="flex items-center gap-2">
                                            <input
                                              autoFocus
                                              className="h-9 flex-1 rounded-md border border-surface-border bg-surface-strong px-3 text-sm text-foreground"
                                              maxLength={60}
                                              onChange={(event) => setBucketEditName(event.target.value)}
                                              onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                  event.preventDefault();
                                                  handleRenameBucket();
                                                }
                                                if (event.key === 'Escape') {
                                                  closeBucketRename();
                                                }
                                              }}
                                              placeholder={`Edit ${group.name}`}
                                              value={bucketEditName}
                                            />
                                            <button
                                              aria-label={`Delete ${group.name}`}
                                              className={buttonClassName({
                                                size: 'sm',
                                                variant: 'ghost',
                                                className:
                                                  'h-9 w-9 px-0 text-danger hover:bg-danger/10 hover:text-danger',
                                              })}
                                              disabled={isSavingBucketEdit}
                                              onClick={() => {
                                                setBucketDeleteGroupId(group.id);
                                                setBucketDeleteError('');
                                              }}
                                              type="button"
                                            >
                                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                                            </button>
                                            <button
                                              className={buttonClassName({ size: 'sm', className: 'h-9 px-3 text-xs' })}
                                              disabled={isSavingBucketEdit}
                                              onClick={handleRenameBucket}
                                              type="button"
                                            >
                                              {isSavingBucketEdit ? 'Saving...' : 'Save'}
                                            </button>
                                          </div>
                                          {bucketDeleteGroupId === group.id ? (
                                            <div className="mt-2 rounded-md border border-surface-border bg-surface-elevated/60 p-2">
                                              <p className="text-xs text-foreground">Delete {group.name} and its bucket lists?</p>
                                              {bucketDeleteError ? (
                                                <p className="mt-1 text-xs text-danger">{bucketDeleteError}</p>
                                              ) : null}
                                              <div className="mt-2 flex justify-end gap-2">
                                                <button
                                                  className={buttonClassName({ size: 'sm', variant: 'ghost', className: 'h-8 px-2.5 text-xs' })}
                                                  disabled={isDeletingBucket}
                                                  onClick={closeBucketDeleteDialog}
                                                  type="button"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  className={buttonClassName({
                                                    size: 'sm',
                                                    variant: 'danger',
                                                    className: 'h-8 px-2.5 text-xs',
                                                  })}
                                                  disabled={isDeletingBucket}
                                                  onClick={handleDeleteBucket}
                                                  type="button"
                                                >
                                                  {isDeletingBucket ? 'Deleting...' : 'Delete'}
                                                </button>
                                              </div>
                                            </div>
                                          ) : null}
                                          {bucketEditError ? <p className="mt-1 text-xs text-danger">{bucketEditError}</p> : null}
                                        </div>
                                      ) : null}
                                    </div>
                                    <button
                                      className={buttonClassName({
                                        variant: 'secondary',
                                        size: 'sm',
                                        className: 'ml-1 hidden h-7 px-2 text-[11px] md:inline-flex',
                                      })}
                                      onClick={() => startCreateCategory(group.id, false)}
                                      type="button"
                                    >
                                      + Bucket List
                                    </button>
                                    <button
                                      className={buttonClassName({
                                        variant: 'secondary',
                                        size: 'sm',
                                        className: 'ml-1 h-7 px-2 text-[11px] md:hidden',
                                      })}
                                      onClick={() => startCreateCategory(group.id, true)}
                                      type="button"
                                    >
                                      + List
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right text-foreground">
                                  {formatCurrency(group.totals.allocated)}
                                </td>
                                <td className="px-2 py-2 text-right text-foreground">
                                  {formatCurrency(group.totals.spent)}
                                </td>
                                <td className="px-2 py-2 text-right text-foreground">
                                  {formatCurrency(group.totals.balance)}
                                </td>
                              </tr>

                              {categoryCreateGroupId === group.id && !useMobileCategorySheet ? (
                                <tr className="border-b border-surface-border bg-surface-elevated/40">
                                  <td className="px-6 py-2" colSpan={4}>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        aria-label="Bucket list name"
                                        className="w-full rounded-md border border-surface-border bg-background px-2 py-1 text-sm md:w-72"
                                        maxLength={80}
                                        onChange={(event) => setNewCategoryName(event.target.value)}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            handleCreateCategory();
                                          }
                                          if (event.key === 'Escape') {
                                            setCategoryCreateGroupId(null);
                                            setNewCategoryName('');
                                            setNewCategoryError('');
                                          }
                                        }}
                                        placeholder="New bucket list name"
                                        value={newCategoryName}
                                      />
                                      <button
                                        className={buttonClassName({ size: 'sm', className: 'h-8 px-2.5 text-xs' })}
                                        disabled={isCreatingCategory}
                                        onClick={handleCreateCategory}
                                        type="button"
                                      >
                                        {isCreatingCategory ? 'Creating...' : 'Add'}
                                      </button>
                                      <button
                                        className={buttonClassName({ size: 'sm', variant: 'ghost', className: 'h-8 px-2.5 text-xs' })}
                                        onClick={() => {
                                          setCategoryCreateGroupId(null);
                                          setNewCategoryName('');
                                          setNewCategoryError('');
                                        }}
                                        type="button"
                                      >
                                        Cancel
                                      </button>
                                      {newCategoryError ? (
                                        <p className="w-full text-xs text-danger">{newCategoryError}</p>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ) : null}

                              {!isCollapsed
                                ? group.categories.map((category) => {
                                    const isSelected = category.id === selectedCategoryId;
                                    return (
                                      <tr
                                        key={category.id}
                                        className={`cursor-pointer border-b border-surface-border hover:bg-surface-elevated ${
                                          isSelected ? 'bg-surface-elevated' : ''
                                        }`}
                                        onClick={() => {
                                          setSelectedCategoryId(category.id);
                                          setDetailsCollapsed(false);
                                        }}
                                      >
                                        <td className="px-4 py-2 text-sm text-foreground">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-block h-4 w-4 rounded-sm border border-surface-border" />
                                            <div className="relative flex items-center gap-1">
                                              <span>{category.name}</span>
                                              <button
                                                aria-label={`Rename ${category.name}`}
                                                className={buttonClassName({
                                                  variant: 'ghost',
                                                  size: 'sm',
                                                  className: 'h-8 w-8 px-0 text-muted-foreground hover:text-foreground',
                                                })}
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openCategoryRename(category);
                                                }}
                                                type="button"
                                              >
                                                <Pencil aria-hidden="true" className="h-4 w-4" />
                                              </button>
                                              {categoryEditId === category.id ? (
                                                <div
                                                  className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(90vw,420px)] rounded-[var(--radius-md)] border border-surface-border bg-background p-2 shadow-lg"
                                                  ref={categoryEditPopoverRef}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <input
                                                      autoFocus
                                                      className="h-9 flex-1 rounded-md border border-surface-border bg-surface-strong px-3 text-sm text-foreground"
                                                      maxLength={80}
                                                      onChange={(event) => setCategoryEditName(event.target.value)}
                                                      onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                          event.preventDefault();
                                                          handleRenameCategory();
                                                        }
                                                        if (event.key === 'Escape') {
                                                          closeCategoryRename();
                                                        }
                                                      }}
                                                      placeholder={`Edit ${category.name}`}
                                                      value={categoryEditName}
                                                    />
                                                    <button
                                                      aria-label={`Delete ${category.name}`}
                                                      className={buttonClassName({
                                                        size: 'sm',
                                                        variant: 'ghost',
                                                        className:
                                                          'h-9 w-9 px-0 text-danger hover:bg-danger/10 hover:text-danger',
                                                      })}
                                                      disabled={isSavingCategoryEdit}
                                                      onClick={(event) => {
                                                        event.stopPropagation();
                                                        setCategoryDeleteId(category.id);
                                                        setCategoryDeleteError('');
                                                      }}
                                                      type="button"
                                                    >
                                                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                      className={buttonClassName({ size: 'sm', className: 'h-9 px-3 text-xs' })}
                                                      disabled={isSavingCategoryEdit}
                                                      onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleRenameCategory();
                                                      }}
                                                      type="button"
                                                    >
                                                      {isSavingCategoryEdit ? 'Saving...' : 'Save'}
                                                    </button>
                                                  </div>
                                                  {categoryDeleteId === category.id ? (
                                                    <div className="mt-2 rounded-md border border-surface-border bg-surface-elevated/60 p-2">
                                                      <p className="text-xs text-foreground">
                                                        Delete {category.name} bucket list?
                                                      </p>
                                                      {categoryDeleteError ? (
                                                        <p className="mt-1 text-xs text-danger">{categoryDeleteError}</p>
                                                      ) : null}
                                                      <div className="mt-2 flex justify-end gap-2">
                                                        <button
                                                          className={buttonClassName({
                                                            size: 'sm',
                                                            variant: 'ghost',
                                                            className: 'h-8 px-2.5 text-xs',
                                                          })}
                                                          disabled={isDeletingCategory}
                                                          onClick={(event) => {
                                                            event.stopPropagation();
                                                            setCategoryDeleteId(null);
                                                            setCategoryDeleteError('');
                                                            setDeletingCategory(false);
                                                          }}
                                                          type="button"
                                                        >
                                                          Cancel
                                                        </button>
                                                        <button
                                                          className={buttonClassName({
                                                            size: 'sm',
                                                            variant: 'danger',
                                                            className: 'h-8 px-2.5 text-xs',
                                                          })}
                                                          disabled={isDeletingCategory}
                                                          onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleDeleteCategory();
                                                          }}
                                                          type="button"
                                                        >
                                                          {isDeletingCategory ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : null}
                                                  {categoryEditError ? (
                                                    <p className="mt-1 text-xs text-danger">{categoryEditError}</p>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 text-right text-foreground">
                                          <input
                                            aria-label={`${category.name} assigned amount`}
                                            className="w-28 rounded-md border border-surface-border bg-background px-2 py-1 text-right text-sm"
                                            inputMode="decimal"
                                            onBlur={() => handleAssignedChange(category.id)}
                                            onChange={(event) =>
                                              setAssignedDrafts((previous) => ({
                                                ...previous,
                                                [category.id]: event.target.value,
                                              }))
                                            }
                                            onClick={() => {
                                              setSelectedCategoryId(category.id);
                                              setDetailsCollapsed(false);
                                            }}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter') {
                                                event.preventDefault();
                                                handleAssignedChange(category.id);
                                              }
                                            }}
                                            value={assignedDrafts[category.id] ?? category.assigned.toFixed(2)}
                                          />
                                          {savingAssignedId === category.id ? (
                                            <p className="mt-1 text-[10px] text-muted-foreground">Saving...</p>
                                          ) : null}
                                        </td>
                                        <td className="px-2 py-2 text-right text-foreground">
                                          {formatCurrency(category.activity)}
                                        </td>
                                        <td className="px-2 py-2 text-right text-foreground">
                                          {formatCurrency(category.available)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                : null}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {!detailsCollapsed ? (
              <Card className="flex min-h-[400px] flex-col gap-4 p-4">
                {selectedCategory ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bucket List
                      </p>
                      <p className="text-lg font-semibold text-foreground">{selectedCategory.name}</p>
                    </div>

                    <div className="space-y-2 rounded-[var(--radius-md)] border border-surface-border bg-muted/40 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(selectedCategory.available)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned this month</span>
                        <span className="text-foreground">{formatCurrency(selectedCategory.assigned)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Activity this month</span>
                        <span className="text-foreground">{formatCurrency(selectedCategory.activity)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Target
                      </p>
                      <button
                        className={buttonClassName({ size: 'sm', variant: 'secondary' })}
                        onClick={() => {
                          setTargetEditorOpen((previous) => !previous);
                          setTargetFormError('');
                        }}
                        type="button"
                      >
                        {isTargetEditorOpen ? 'Close target editor' : selectedCategory.goal ? 'Edit target' : 'Create Target'}
                      </button>
                      {isTargetEditorOpen ? (
                        <div className="space-y-3 rounded-[var(--radius-md)] border border-surface-border bg-muted/30 p-3 text-sm">
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Target Amount</span>
                            <input
                              className="w-full rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm text-foreground"
                              inputMode="decimal"
                              min="0"
                              onChange={(event) => setTargetAmountDraft(event.target.value)}
                              type="number"
                              value={targetAmountDraft}
                            />
                          </label>

                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              checked={isTargetIndefinite}
                              className="h-4 w-4 rounded border-surface-border bg-surface-strong text-brand"
                              onChange={(event) => setTargetIndefinite(event.target.checked)}
                              type="checkbox"
                            />
                            Repeat this budget
                          </label>

                          {isTargetIndefinite ? (
                            <label className="block space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">Cadence</span>
                              <select
                                className="w-full rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm text-foreground"
                                onChange={(event) => setTargetCadenceDraft(event.target.value)}
                                value={targetCadenceDraft}
                              >
                                <option value="">Select cadence</option>
                                <option value="weekly">weekly</option>
                                <option value="bi_weekly">bi_weekly</option>
                                <option value="monthly">monthly</option>
                                <option value="quarterly">quarterly</option>
                                <option value="yearly">yearly</option>
                              </select>
                            </label>
                          ) : (
                            <label className="block space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">Target Date</span>
                              <input
                                className="w-full rounded-md border border-surface-border bg-background px-2 py-1.5 text-sm text-foreground"
                                onChange={(event) => setTargetDateDraft(event.target.value)}
                                type="date"
                                value={targetDateDraft}
                              />
                            </label>
                          )}

                          {targetFormError ? <p className="text-xs text-danger">{targetFormError}</p> : null}

                          <div className="flex gap-2">
                            <button
                              className={buttonClassName({ size: 'sm' })}
                              disabled={isSavingTarget}
                              onClick={handleTargetSave}
                              type="button"
                            >
                              {isSavingTarget ? 'Saving...' : 'Save Target'}
                            </button>
                            <button
                              className={buttonClassName({ size: 'sm', variant: 'ghost' })}
                              onClick={() => {
                                setTargetEditorOpen(false);
                                setTargetFormError('');
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a bucket list from the left to see details.
                  </p>
                )}
              </Card>
            ) : null}
          </div>
        </>
      ) : null}

      {isCreateBucketOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="mx-auto mt-20 hidden w-full max-w-md rounded-[var(--radius-md)] border border-surface-border bg-background p-4 shadow-lg md:block">
            <p className="text-sm font-semibold text-foreground">Add Bucket</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a bucket for organizing bucket lists.</p>
            <input
              autoFocus
              className="mt-3 w-full rounded-md border border-surface-border bg-surface-strong px-3 py-2 text-sm text-foreground"
              maxLength={60}
              onChange={(event) => setNewBucketName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateBucket();
                }
                if (event.key === 'Escape') {
                  setCreateBucketOpen(false);
                }
              }}
              placeholder="Bucket name"
              value={newBucketName}
            />
            {newBucketError ? <p className="mt-2 text-xs text-danger">{newBucketError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                className={buttonClassName({ size: 'sm', variant: 'ghost' })}
                onClick={() => setCreateBucketOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ size: 'sm' })}
                disabled={isCreatingBucket}
                onClick={handleCreateBucket}
                type="button"
              >
                {isCreatingBucket ? 'Creating...' : 'Create Bucket'}
              </button>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 rounded-t-[var(--radius-md)] border border-surface-border bg-background p-4 shadow-lg md:hidden">
            <p className="text-sm font-semibold text-foreground">Add Bucket</p>
            <input
              autoFocus
              className="mt-3 w-full rounded-md border border-surface-border bg-surface-strong px-3 py-2 text-sm text-foreground"
              maxLength={60}
              onChange={(event) => setNewBucketName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateBucket();
                }
              }}
              placeholder="Bucket name"
              value={newBucketName}
            />
            {newBucketError ? <p className="mt-2 text-xs text-danger">{newBucketError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                className={buttonClassName({ size: 'sm', variant: 'ghost' })}
                onClick={() => setCreateBucketOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ size: 'sm' })}
                disabled={isCreatingBucket}
                onClick={handleCreateBucket}
                type="button"
              >
                {isCreatingBucket ? 'Creating...' : 'Create Bucket'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {categoryCreateGroupId && useMobileCategorySheet ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 md:hidden">
          <div className="fixed inset-x-0 bottom-0 rounded-t-[var(--radius-md)] border border-surface-border bg-background p-4 shadow-lg">
            <p className="text-sm font-semibold text-foreground">Add Bucket List</p>
            <input
              autoFocus
              className="mt-3 w-full rounded-md border border-surface-border bg-surface-strong px-3 py-2 text-sm text-foreground"
              maxLength={80}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateCategory();
                }
              }}
              placeholder="Bucket list name"
              value={newCategoryName}
            />
            {newCategoryError ? <p className="mt-2 text-xs text-danger">{newCategoryError}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                className={buttonClassName({ size: 'sm', variant: 'ghost' })}
                onClick={() => {
                  setCategoryCreateGroupId(null);
                  setUseMobileCategorySheet(false);
                  setNewCategoryName('');
                  setNewCategoryError('');
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ size: 'sm' })}
                disabled={isCreatingCategory}
                onClick={handleCreateCategory}
                type="button"
              >
                {isCreatingCategory ? 'Creating...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

