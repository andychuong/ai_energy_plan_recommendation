import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { apiClient } from '@/services/api/client';
import type { CurrentPlan, UsageDataPoint, CustomerUsageData } from 'shared/types';

interface MonthData {
  month: string;
  year: number;
  date: Date;
  kwh: number | null;
  cost: number | null;
  isEditing: boolean;
  editedKwh: string;
  editedCost: string;
}

export function UsageDataPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const {
    usageData,
    uploadUsageData,
    isUploading,
    refetch: refetchUsageData,
  } = useUsageData(userId);
  const { saveUserProfileAsync } = useUserProfile(userId);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<CustomerUsageData | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  // Manual entry state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [manualKwh, setManualKwh] = useState<string>('');
  const [manualCost, setManualCost] = useState<string>('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingManualEntry, setPendingManualEntry] = useState<{
    month: string;
    year: number;
    kwh: number;
    cost: number;
  } | null>(null);

  // Current plan state
  const [currentPlan, setCurrentPlan] = useState<
    Partial<CurrentPlan & { contractStartDate?: string }>
  >({
    ratePerKwh: 0,
    contractStartDate: '',
    contractEndDate: '',
    earlyTerminationFee: 0,
    supplierName: '',
    planName: '',
    contractType: 'fixed',
  });

  // Override mode state
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable average state
  const [editableAverageKwh, setEditableAverageKwh] = useState<string>('');
  const [editableAverageCost, setEditableAverageCost] = useState<string>('');
  const [isSavingAverages, setIsSavingAverages] = useState(false);

  // Load override mode and custom averages from user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) return;

      try {
        const profile = await apiClient.getUserProfile(userId);
        if (profile) {
          if (profile.useCustomAverages !== undefined) {
            setIsOverrideMode(profile.useCustomAverages);
          }
          if (
            profile.customAverageKwh !== undefined &&
            profile.customAverageKwh !== null
          ) {
            setEditableAverageKwh(profile.customAverageKwh.toString());
          }
          if (
            profile.customAverageCost !== undefined &&
            profile.customAverageCost !== null
          ) {
            setEditableAverageCost(profile.customAverageCost.toString());
          }
        }
      } catch (err) {
        console.warn('Could not load user profile:', err);
      }
    };

    loadUserProfile();
  }, [userId]);

  // Save override mode preference when toggle changes
  const handleOverrideModeChange = async (checked: boolean) => {
    setIsOverrideMode(checked);

    if (!userId) return;

    try {
      await saveUserProfileAsync({
        userId,
        profile: {
          useCustomAverages: checked,
        },
      });
    } catch (err) {
      console.error('Failed to save override mode preference:', err);
      // Revert on error
      setIsOverrideMode(!checked);
    }
  };

  // Sync current plan with usage data when it loads
  useEffect(() => {
    const loadCurrentPlan = async () => {
      if (!userId) return;

      try {
        // Try to get current plan from database
        const result = await apiClient.getCurrentPlan(userId);
        if (result) {
          setCurrentPlan({
            supplierName: result.supplierName || '',
            planName: result.planName || '',
            contractStartDate: result.contractStartDate || '',
            contractEndDate: result.contractEndDate || '',
            earlyTerminationFee: result.earlyTerminationFee || 0,
            contractType:
              (result.contractType as
                | 'fixed'
                | 'variable'
                | 'indexed'
                | 'hybrid') || 'fixed',
          });
          return;
        }
      } catch (err) {
        console.warn('Could not load current plan from database:', err);
      }

      // Fallback to usage data billing info
      if (usageData?.billingInfo?.currentPlan) {
        const currentPlanData = usageData.billingInfo.currentPlan;
        setCurrentPlan({
          supplierName: currentPlanData.supplierName || '',
          planName: ('planName' in currentPlanData && currentPlanData.planName) ? String(currentPlanData.planName) : '',
          contractEndDate:
            ('contractEndDate' in currentPlanData && currentPlanData.contractEndDate) ? String(currentPlanData.contractEndDate) : '',
          earlyTerminationFee:
            ('earlyTerminationFee' in currentPlanData && currentPlanData.earlyTerminationFee !== undefined) ? Number(currentPlanData.earlyTerminationFee) : 0,
          contractType:
            ('contractType' in currentPlanData && currentPlanData.contractType) ? String(currentPlanData.contractType) as 'fixed' | 'variable' | 'indexed' | 'hybrid' : 'fixed',
        });
      }
    };

    loadCurrentPlan();
  }, [usageData, userId]);

  // Calculate past 12 months (from month before current month going back)
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);

  useEffect(() => {
    const now = new Date();
    const months: MonthData[] = [];

    // Start from the month before current month, going back 12 months
    // Most recent first (i=0 is most recent, i=11 is oldest)
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();

      // Find matching usage data point
      let usagePoint: UsageDataPoint | null = null;
      if (usageData?.usageDataPoints) {
        usagePoint =
          usageData.usageDataPoints.find((point: UsageDataPoint) => {
            const pointDate = new Date(point.timestamp);
            return (
              pointDate.getMonth() === date.getMonth() &&
              pointDate.getFullYear() === date.getFullYear()
            );
          }) || null;
      }

      months.push({
        month: monthName,
        year,
        date,
        kwh: usagePoint?.kwh ?? null,
        cost: usagePoint?.cost ?? null,
        isEditing: false,
        editedKwh: usagePoint?.kwh?.toString() || '',
        editedCost: usagePoint?.cost?.toString() || '',
      });
    }

    setMonthlyData(months);
  }, [usageData]);

  // Calculate average from monthly data
  const calculatedAverageKwh = useMemo(() => {
    const validMonths = monthlyData.filter(m => m.kwh !== null && m.kwh > 0);
    if (validMonths.length === 0) return 0;
    const sum = validMonths.reduce((acc, m) => acc + (m.kwh || 0), 0);
    return sum / validMonths.length;
  }, [monthlyData]);

  const calculatedAverageCost = useMemo(() => {
    const validMonths = monthlyData.filter(m => m.cost !== null && m.cost > 0);
    if (validMonths.length === 0) return 0;
    const sum = validMonths.reduce((acc, m) => acc + (m.cost || 0), 0);
    return sum / validMonths.length;
  }, [monthlyData]);

  // Use editable averages if override mode is on, otherwise use calculated
  const averageKwh =
    isOverrideMode && editableAverageKwh
      ? parseFloat(editableAverageKwh) || calculatedAverageKwh
      : calculatedAverageKwh;

  const averageCost =
    isOverrideMode && editableAverageCost
      ? parseFloat(editableAverageCost) || calculatedAverageCost
      : calculatedAverageCost;

  // Initialize editable averages when override mode is turned on
  // Use saved custom averages if available, otherwise use calculated averages
  useEffect(() => {
    if (isOverrideMode) {
      // Only initialize if we don't already have values (from user profile)
      if (
        !editableAverageKwh ||
        editableAverageKwh === '0' ||
        editableAverageKwh === '0.00'
      ) {
        setEditableAverageKwh(
          calculatedAverageKwh > 0 ? calculatedAverageKwh.toFixed(2) : ''
        );
      }
      if (
        !editableAverageCost ||
        editableAverageCost === '0' ||
        editableAverageCost === '0.00'
      ) {
        setEditableAverageCost(
          calculatedAverageCost > 0 ? calculatedAverageCost.toFixed(2) : ''
        );
      }
    }
    // Note: We intentionally only depend on isOverrideMode and calculated averages
    // to avoid re-initializing when editable values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverrideMode, calculatedAverageKwh, calculatedAverageCost]);

  // Update monthlyData when editable averages change in override mode (for immediate UI update)
  // Use a ref to track previous values and avoid unnecessary updates
  const prevEditableValuesRef = React.useRef<{ kwh: string; cost: string }>({
    kwh: '',
    cost: '',
  });

  useEffect(() => {
    if (isOverrideMode && editableAverageKwh) {
      const avgKwh = parseFloat(editableAverageKwh);
      const avgCost = editableAverageCost
        ? parseFloat(editableAverageCost)
        : null;

      // Only update if values changed and are valid
      const valuesChanged =
        prevEditableValuesRef.current.kwh !== editableAverageKwh ||
        prevEditableValuesRef.current.cost !== (editableAverageCost || '');

      if (avgKwh > 0 && !isNaN(avgKwh) && valuesChanged) {
        prevEditableValuesRef.current = {
          kwh: editableAverageKwh,
          cost: editableAverageCost || '',
        };

        setMonthlyData(prev =>
          prev.map(m => ({
            ...m,
            kwh: avgKwh,
            cost:
              avgCost ||
              (currentPlan.ratePerKwh ? avgKwh * currentPlan.ratePerKwh : null),
            editedKwh: avgKwh.toString(),
            editedCost: (
              avgCost ||
              (currentPlan.ratePerKwh ? avgKwh * currentPlan.ratePerKwh : 0)
            ).toString(),
          }))
        );
      }
    }
    // Note: We intentionally don't include editableAverageKwh and editableAverageCost
    // in the dependency array to avoid infinite loops. The effect only runs when
    // isOverrideMode changes or when the calculated averages change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverrideMode, currentPlan.ratePerKwh]);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  }, []);

  const processFile = async (
    fileToProcess: File,
    overrideDuplicates: boolean = false
  ) => {
    if (!fileToProcess || !userId) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    try {
      setError(null);
      setSuccess(false);

      // Check file type
      const isCSV =
        fileToProcess.type === 'text/csv' ||
        fileToProcess.name.endsWith('.csv');
      const isPDF =
        fileToProcess.type === 'application/pdf' ||
        fileToProcess.name.endsWith('.pdf');
      const isImage =
        fileToProcess.type.startsWith('image/') ||
        /\.(png|jpg|jpeg)$/i.test(fileToProcess.name);
      const isText =
        fileToProcess.type === 'text/plain' ||
        fileToProcess.name.endsWith('.txt');

      if (isPDF || isImage || isText || isCSV) {
        const usageData = await apiClient.readStatement(userId, fileToProcess);
        setExtractedData(usageData);

        // Check for duplicates if not overriding
        if (!overrideDuplicates) {
          const duplicates: Array<{ month: string; year: number }> = [];
          usageData.usageDataPoints.forEach(point => {
            const pointDate = new Date(point.timestamp);
            const monthName = pointDate.toLocaleString('default', {
              month: 'long',
            });
            const year = pointDate.getFullYear();
            if (hasExistingData(monthName, year)) {
              duplicates.push({ month: monthName, year });
            }
          });

          if (duplicates.length > 0) {
            const duplicateMonths = duplicates
              .map(d => `${d.month} ${d.year}`)
              .join(', ');
            const shouldOverride = window.confirm(
              `Data already exists for the following months: ${duplicateMonths}\n\n` +
                `Do you want to override the existing data?`
            );
            if (!shouldOverride) {
              setError('Upload cancelled. Existing data was not overwritten.');
              return;
            }
            // User confirmed, proceed with override
            return processFile(fileToProcess, true);
          }
        }

        // Process and store the usage data
        uploadUsageData(
          {
            userId,
            usageData: {
              userId,
              usagePoints: usageData.usageDataPoints,
              totalAnnualKwh: usageData.aggregatedStats.totalKwh,
              averageMonthlyKwh: usageData.aggregatedStats.averageMonthlyKwh,
              peakMonthKwh: usageData.aggregatedStats.peakMonthKwh,
              peakMonth: usageData.aggregatedStats.peakMonth,
            },
          },
          {
            onSuccess: async () => {
              setSuccess(true);
              // Refetch usage data to update the UI
              await refetchUsageData();
              setTimeout(() => {
                navigate('/dashboard');
              }, 3000);
            },
            onError: err => {
              setError(
                err instanceof Error ? err.message : 'Failed to upload data'
              );
            },
          }
        );
      } else {
        setError(
          'Unsupported file type. Please upload PDF, image, CSV, or text file.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  const handleFileUpload = async () => {
    if (file) {
      await processFile(file);
    }
  };

  // Check if a month/year already has data
  const hasExistingData = (month: string, year: number): boolean => {
    return monthlyData.some(
      m =>
        m.month === month &&
        m.year === year &&
        (m.kwh !== null || m.cost !== null)
    );
  };

  // Get available months for selection (past 12 months)
  const getAvailableMonths = () => {
    const now = new Date();
    const months: Array<{ month: string; year: number; date: Date }> = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      months.push({
        month: monthName,
        year: date.getFullYear(),
        date,
      });
    }
    return months;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedMonth || !selectedYear) {
      setError('Please select a month and year');
      return;
    }

    const kwh = parseFloat(manualKwh);
    const cost = parseFloat(manualCost) || 0;

    // Validation
    if (!manualKwh || isNaN(kwh) || kwh <= 0) {
      setError('Please enter a valid kWh value (must be greater than 0)');
      return;
    }

    if (kwh > 100000) {
      setError('kWh value seems unreasonably high. Please check your input.');
      return;
    }

    if (cost < 0) {
      setError('Cost cannot be negative');
      return;
    }

    if (cost > 10000) {
      setError('Cost value seems unreasonably high. Please check your input.');
      return;
    }

    // Reasonableness check: typical cost per kWh is between $0.05 and $0.50
    if (cost > 0 && kwh > 0) {
      const ratePerKwh = cost / kwh;
      if (ratePerKwh < 0.01 || ratePerKwh > 2.0) {
        setError(
          `Cost per kWh ($${ratePerKwh.toFixed(3)}) seems unusual. Please verify your values.`
        );
        return;
      }
    }

    // Check for duplicate
    if (hasExistingData(selectedMonth, selectedYear)) {
      setPendingManualEntry({
        month: selectedMonth,
        year: selectedYear,
        kwh,
        cost,
      });
      setShowDuplicateDialog(true);
      return;
    }

    // No duplicate, proceed with adding
    await addManualEntry(selectedMonth, selectedYear, kwh, cost);
  };

  const addManualEntry = async (
    month: string,
    year: number,
    kwh: number,
    cost: number
  ) => {
    if (!userId) return;

    setIsSubmittingManual(true);
    setError(null);

    try {
      // Find the matching month in monthlyData
      const monthIndex = monthlyData.findIndex(
        m => m.month === month && m.year === year
      );

      if (monthIndex === -1) {
        setError('Selected month not found in available months');
        setIsSubmittingManual(false);
        return;
      }

      // Create usage point for this month
      const date = new Date(year, getMonthIndex(month), 1);
      const usagePoint: UsageDataPoint = {
        timestamp: date.toISOString(),
        kwh,
        cost: cost || undefined,
      };

      // Get all existing usage points, excluding the month we're updating
      const existingPoints = monthlyData
        .filter(m => {
          // Exclude the month we're updating
          if (m.month === month && m.year === year) return false;
          return m.kwh !== null && m.kwh > 0;
        })
        .map(m => {
          const d = new Date(m.year, getMonthIndex(m.month), 1);
          return {
            timestamp: d.toISOString(),
            kwh: m.kwh!,
            cost: m.cost || undefined,
          };
        });

      // Add the new/updated entry
      const updatedPoints = [...existingPoints, usagePoint];

      // Update the monthly data state
      setMonthlyData(prev =>
        prev.map((m, i) =>
          i === monthIndex
            ? {
                ...m,
                kwh,
                cost: cost || null,
                editedKwh: kwh.toString(),
                editedCost: cost ? cost.toString() : '',
              }
            : m
        )
      );

      // Calculate aggregated stats
      const totalKwh = updatedPoints.reduce((sum, p) => sum + p.kwh, 0);
      const avgMonthlyKwh =
        updatedPoints.length > 0 ? totalKwh / updatedPoints.length : 0;
      const peakPoint = updatedPoints.reduce(
        (max, p) => (p.kwh > max.kwh ? p : max),
        updatedPoints[0]
      );
      const peakDate = new Date(peakPoint.timestamp);
      const peakMonth = peakDate.toLocaleString('default', { month: 'long' });
      const peakMonthKwh = peakPoint.kwh;

      uploadUsageData(
        {
          userId,
          usageData: {
            userId,
            usagePoints: updatedPoints,
            totalAnnualKwh: totalKwh,
            averageMonthlyKwh: avgMonthlyKwh,
            peakMonthKwh,
            peakMonth,
          },
        },
        {
          onSuccess: async () => {
            setSuccess(true);
            setManualKwh('');
            setManualCost('');
            setSelectedMonth('');
            setSelectedYear(0);
            setIsSubmittingManual(false);
            // Refetch usage data to update the UI
            await refetchUsageData();
            setTimeout(() => {
              setSuccess(false);
            }, 3000);
          },
          onError: err => {
            setError(
              err instanceof Error ? err.message : 'Failed to save data'
            );
            setIsSubmittingManual(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process data');
      setIsSubmittingManual(false);
    }
  };

  const getMonthIndex = (monthName: string): number => {
    const months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    return months.indexOf(monthName.toLowerCase());
  };

  const handleConfirmDuplicate = async () => {
    if (pendingManualEntry) {
      await addManualEntry(
        pendingManualEntry.month,
        pendingManualEntry.year,
        pendingManualEntry.kwh,
        pendingManualEntry.cost
      );
      setShowDuplicateDialog(false);
      setPendingManualEntry(null);
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setPendingManualEntry(null);
  };

  const handleSaveCurrentPlan = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!currentPlan.supplierName) {
      setError('Supplier name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiClient.saveCurrentPlan(userId, {
        supplierName: currentPlan.supplierName,
        planName: currentPlan.planName,
        contractStartDate: currentPlan.contractStartDate,
        contractEndDate: currentPlan.contractEndDate,
        earlyTerminationFee: currentPlan.earlyTerminationFee,
        contractType: currentPlan.contractType,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save current plan'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditRow = (index: number) => {
    setMonthlyData(prev =>
      prev.map((m, i) =>
        i === index
          ? { ...m, isEditing: !m.isEditing }
          : { ...m, isEditing: false }
      )
    );
  };

  const updateRowField = (
    index: number,
    field: 'editedKwh' | 'editedCost',
    value: string
  ) => {
    setMonthlyData(prev =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const saveRow = (index: number) => {
    setMonthlyData(prev =>
      prev.map((m, i) => {
        if (i === index) {
          const kwh = parseFloat(m.editedKwh) || null;
          const cost = parseFloat(m.editedCost) || null;
          return {
            ...m,
            kwh,
            cost,
            isEditing: false,
          };
        }
        return m;
      })
    );
  };

  const cancelEditRow = (index: number) => {
    setMonthlyData(prev =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              isEditing: false,
              editedKwh: m.kwh?.toString() || '',
              editedCost: m.cost?.toString() || '',
            }
          : m
      )
    );
  };

  // Save editable averages and apply to all months
  const handleSaveAverages = async () => {
    if (!userId) return;

    const avgKwh = parseFloat(editableAverageKwh);
    const avgCost = parseFloat(editableAverageCost);

    if (!avgKwh || avgKwh <= 0) {
      setError('Please enter a valid average monthly kWh');
      return;
    }

    setIsSavingAverages(true);
    setError(null);

    try {
      // Save custom averages to user profile
      // eslint-disable-next-line no-console
      console.log('[UsageDataPage] Saving custom averages:', {
        avgKwh,
        avgCost,
      });
      await saveUserProfileAsync({
        userId,
        profile: {
          customAverageKwh: avgKwh,
          customAverageCost: avgCost || undefined,
        },
      });
      // eslint-disable-next-line no-console
      console.log('[UsageDataPage] Custom averages saved to user profile');

      // Update all months with the average values
      setMonthlyData(prev =>
        prev.map(m => ({
          ...m,
          kwh: avgKwh,
          cost:
            avgCost ||
            (currentPlan.ratePerKwh ? avgKwh * currentPlan.ratePerKwh : null),
          editedKwh: avgKwh.toString(),
          editedCost: (
            avgCost ||
            (currentPlan.ratePerKwh ? avgKwh * currentPlan.ratePerKwh : 0)
          ).toString(),
        }))
      );

      // Save to backend
      const now = new Date();
      const usagePoints: UsageDataPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
        usagePoints.push({
          timestamp: date.toISOString(),
          kwh: avgKwh,
          cost: avgCost || undefined,
        });
      }

      const totalKwh = avgKwh * 12;

      uploadUsageData(
        {
          userId,
          usageData: {
            userId,
            usagePoints,
            totalAnnualKwh: totalKwh,
            averageMonthlyKwh: avgKwh,
            peakMonthKwh: avgKwh,
            peakMonth: 'Average',
          },
        },
        {
          onSuccess: async () => {
            setIsSavingAverages(false);
            setSuccess(true);
            // Refetch usage data to update the UI
            await refetchUsageData();
            setTimeout(() => setSuccess(false), 3000);
          },
          onError: err => {
            setError(
              err instanceof Error ? err.message : 'Failed to save averages'
            );
            setIsSavingAverages(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save averages');
      setIsSavingAverages(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Usage Data</h1>
        <p className="mt-2 text-muted-foreground">
          Add and manage your energy usage data to get personalized
          recommendations
        </p>
      </div>

      {/* Current Plan Information */}
      <Card className="mx-auto mb-6 max-w-6xl">
        <CardHeader>
          <CardTitle>Current Plan Information</CardTitle>
          <CardDescription>
            Enter your current energy plan details to get accurate
            recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                type="text"
                placeholder="e.g., PG&E, ConEd"
                value={currentPlan.supplierName || ''}
                onChange={e =>
                  setCurrentPlan({
                    ...currentPlan,
                    supplierName: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractStartDate">Contract Start Date</Label>
              <Input
                id="contractStartDate"
                type="date"
                value={currentPlan.contractStartDate || ''}
                onChange={e =>
                  setCurrentPlan({
                    ...currentPlan,
                    contractStartDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractEndDate">Contract End Date</Label>
              <Input
                id="contractEndDate"
                type="date"
                value={currentPlan.contractEndDate || ''}
                onChange={e =>
                  setCurrentPlan({
                    ...currentPlan,
                    contractEndDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earlyTerminationFee">
                Early Termination Fee ($)
              </Label>
              <Input
                id="earlyTerminationFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={currentPlan.earlyTerminationFee || ''}
                onChange={e =>
                  setCurrentPlan({
                    ...currentPlan,
                    earlyTerminationFee: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <Button
            onClick={handleSaveCurrentPlan}
            variant="outline"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Plan Information'}
          </Button>
        </CardContent>
      </Card>

      {/* Past 12 Months Display */}
      <Card className="mx-auto mb-6 max-w-6xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Past 12 Months Usage</CardTitle>
              <CardDescription>
                Your energy consumption for the past 12 months (editable)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="override-mode"
                checked={isOverrideMode}
                onCheckedChange={handleOverrideModeChange}
              />
              <Label htmlFor="override-mode" className="cursor-pointer">
                Input my own average
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Average Display at Top */}
          <div className="mb-4 rounded-lg bg-muted p-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="min-h-[3.5rem]">
                <p className="text-sm text-muted-foreground">
                  Average Monthly kWh
                </p>
                {isOverrideMode ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 h-[1.875rem] w-full px-2 py-0 text-2xl font-bold"
                    value={editableAverageKwh}
                    onChange={e => {
                      setEditableAverageKwh(e.target.value);
                    }}
                    onBlur={handleSaveAverages}
                    disabled={isSavingAverages}
                    placeholder="0.00"
                  />
                ) : (
                  <p className="mt-1 w-full border border-transparent px-2 text-2xl font-bold leading-[1.875rem]">
                    {averageKwh.toFixed(2)}
                  </p>
                )}
                {isOverrideMode && isSavingAverages && (
                  <p className="mt-1 text-xs text-primary">Saving...</p>
                )}
              </div>
              <div className="min-h-[3.5rem]">
                <p className="text-sm text-muted-foreground">
                  Average Monthly Cost
                </p>
                {isOverrideMode ? (
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-2xl font-bold text-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-[1.875rem] w-full py-0 pl-7 pr-2 text-2xl font-bold"
                      value={editableAverageCost}
                      onChange={e => {
                        setEditableAverageCost(e.target.value);
                      }}
                      onBlur={handleSaveAverages}
                      disabled={isSavingAverages}
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-2xl font-bold text-foreground">
                      $
                    </span>
                    <p className="w-full border border-transparent pl-7 pr-2 text-2xl font-bold leading-[1.875rem]">
                      {averageCost.toFixed(2)}
                    </p>
                  </div>
                )}
                {isOverrideMode && isSavingAverages && (
                  <p className="mt-1 text-xs text-primary">Saving...</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Annual kWh
                </p>
                <p className="text-2xl font-bold">
                  {isOverrideMode && editableAverageKwh
                    ? (parseFloat(editableAverageKwh) * 12).toFixed(2)
                    : monthlyData
                        .reduce((sum, m) => sum + (m.kwh || 0), 0)
                        .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Annual Cost
                </p>
                <p className="text-2xl font-bold">
                  $
                  {isOverrideMode && editableAverageCost
                    ? (parseFloat(editableAverageCost) * 12).toFixed(2)
                    : monthlyData
                        .reduce((sum, m) => sum + (m.cost || 0), 0)
                        .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-semibold">Month</th>
                  <th className="p-2 text-right font-semibold">kWh</th>
                  <th className="p-2 text-right font-semibold">Rate ($/kWh)</th>
                  <th className="p-2 text-right font-semibold">Cost ($)</th>
                  <th className="w-32 p-2 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((monthData, index) => {
                  const rate =
                    monthData.kwh && monthData.cost
                      ? monthData.cost / monthData.kwh
                      : currentPlan.ratePerKwh || 0;
                  const calculatedCost =
                    monthData.kwh && currentPlan.ratePerKwh
                      ? monthData.kwh * currentPlan.ratePerKwh
                      : monthData.cost;

                  return (
                    <tr
                      key={`${monthData.month}-${monthData.year}`}
                      className={index % 2 === 0 ? 'bg-muted/50' : ''}
                    >
                      <td className="p-2">
                        {monthData.month} {monthData.year}
                      </td>
                      <td className="h-10 p-2">
                        {monthData.isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="ml-auto h-8 w-24"
                            value={monthData.editedKwh}
                            onChange={e =>
                              updateRowField(index, 'editedKwh', e.target.value)
                            }
                          />
                        ) : (
                          <span className="ml-auto block flex h-8 w-24 items-center justify-end rounded-md border border-transparent text-right">
                            {monthData.kwh !== null
                              ? monthData.kwh.toFixed(2)
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="h-10 p-2">
                        <span className="block flex h-8 items-center justify-end text-right">
                          {rate > 0 ? rate.toFixed(3) : '—'}
                        </span>
                      </td>
                      <td className="h-10 p-2">
                        {monthData.isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="ml-auto h-8 w-24"
                            value={monthData.editedCost}
                            onChange={e =>
                              updateRowField(
                                index,
                                'editedCost',
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span className="ml-auto block flex h-8 w-24 items-center justify-end rounded-md border border-transparent text-right">
                            {calculatedCost !== null &&
                            calculatedCost !== undefined
                              ? calculatedCost.toFixed(2)
                              : monthData.cost !== null
                                ? monthData.cost.toFixed(2)
                                : '—'}
                          </span>
                        )}
                      </td>
                      <td className="h-10 w-32 p-2">
                        <div className="flex h-8 w-full min-w-[8rem] items-center justify-center gap-1">
                          {monthData.isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveRow(index)}
                                className="h-8 flex-1"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEditRow(index)}
                                className="h-8 flex-1"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleEditRow(index)}
                              className="h-8 w-full"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">
                    {monthlyData
                      .reduce((sum, m) => sum + (m.kwh || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">
                    {monthlyData
                      .reduce((sum, m) => {
                        const cost =
                          m.kwh && currentPlan.ratePerKwh
                            ? m.kwh * currentPlan.ratePerKwh
                            : m.cost || 0;
                        return sum + cost;
                      }, 0)
                      .toFixed(2)}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload/Manual Entry Tabs */}
      <Card className="mx-auto max-w-6xl">
        <CardHeader>
          <CardTitle>Add Usage Data</CardTitle>
          <CardDescription>
            Upload your energy bill or manually enter your average usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as 'upload' | 'manual')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Bill</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && extractedData && (
              <Alert className="mt-4">
                <AlertDescription className="space-y-3">
                  <p className="font-semibold">✓ Data saved successfully!</p>
                  <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                    <p className="mb-2 font-medium">Summary:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">
                          Total Annual:
                        </span>{' '}
                        <span className="font-semibold">
                          {extractedData.aggregatedStats?.totalKwh?.toFixed(
                            0
                          ) || 'N/A'}{' '}
                          kWh
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Avg Monthly:
                        </span>{' '}
                        <span className="font-semibold">
                          {extractedData.aggregatedStats?.averageMonthlyKwh?.toFixed(
                            0
                          ) || 'N/A'}{' '}
                          kWh
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Redirecting to dashboard...
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {success && !extractedData && (
              <Alert className="mt-4">
                <AlertDescription>
                  <p className="font-semibold">
                    ✓ Data saved successfully! Redirecting...
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <TabsContent value="upload" className="mt-4 space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-4xl text-muted-foreground">
                  📄
                </div>
                <p className="mb-2 text-lg font-medium">
                  {isDragging
                    ? 'Drop your file here'
                    : 'Drag and drop your energy bill here'}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  or click to browse files
                </p>
                <div className="flex flex-col items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.pdf,.png,.jpg,.jpeg,.txt"
                    onChange={e => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        handleFileChange(selectedFile);
                      }
                    }}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file')?.click()}
                    disabled={isUploading}
                  >
                    Browse Files
                  </Button>
                  {file && (
                    <div className="mt-4 w-full max-w-md rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✓ Selected: {file.name}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Size: {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Supported formats: PDF, PNG, JPG, CSV, TXT
                </p>
              </div>

              <Button
                onClick={handleFileUpload}
                disabled={!file || isUploading || success}
                className="w-full"
              >
                {isUploading ? 'Processing with AI...' : 'Process Bill with AI'}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="selectedMonth">Month & Year</Label>
                    <select
                      id="selectedMonth"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={
                        selectedMonth && selectedYear
                          ? `${selectedMonth}-${selectedYear}`
                          : ''
                      }
                      onChange={e => {
                        const [month, year] = e.target.value.split('-');
                        setSelectedMonth(month);
                        setSelectedYear(parseInt(year, 10));
                      }}
                      disabled={isSubmittingManual || success}
                      required
                    >
                      <option value="">Select month...</option>
                      {getAvailableMonths().map(m => (
                        <option
                          key={`${m.month}-${m.year}`}
                          value={`${m.month}-${m.year}`}
                        >
                          {m.month} {m.year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manualKwh">kWh Used</Label>
                    <Input
                      id="manualKwh"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 500"
                      value={manualKwh}
                      onChange={e => setManualKwh(e.target.value)}
                      disabled={isSubmittingManual || success}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manualCost">Cost ($)</Label>
                    <Input
                      id="manualCost"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 60.00"
                      value={manualCost}
                      onChange={e => setManualCost(e.target.value)}
                      disabled={isSubmittingManual || success}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <Button
                    type="submit"
                    disabled={
                      isSubmittingManual ||
                      success ||
                      !selectedMonth ||
                      !manualKwh
                    }
                  >
                    {isSubmittingManual ? 'Saving...' : 'Add to Table'}
                  </Button>
                </div>
              </form>

              {/* Duplicate Confirmation Dialog */}
              {showDuplicateDialog && pendingManualEntry && (
                <Alert className="mt-4 border-yellow-500 bg-yellow-50">
                  <AlertDescription className="space-y-3">
                    <p className="font-semibold text-yellow-800">
                      Data already exists for {pendingManualEntry.month}{' '}
                      {pendingManualEntry.year}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Do you want to override the existing data?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleConfirmDuplicate}
                        disabled={isSubmittingManual}
                      >
                        Override
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelDuplicate}
                      >
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
