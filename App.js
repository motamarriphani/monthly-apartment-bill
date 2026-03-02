import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as MediaLibrary from "expo-media-library";
import * as Updates from "expo-updates";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import ViewShot from "react-native-view-shot";

const STORAGE_KEY = "water_bill_v1";
const DEFAULT_FLAT_NUMBERS = ["G5", "G6", "G7", "105", "106", "107", "205", "206", "207"];
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const createFlat = (flatNumber) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  flatNumber,
  minutes: "",
  maintenance: "",
  isActive: true
});

const toNumber = (value) => {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const roundRupee = (value) => Math.round(Number.isFinite(value) ? value : 0);
const formatPerMinute = (value) =>
  Number.isFinite(value) ? value.toFixed(3) : "0.000";
const createDefaultFlats = () => DEFAULT_FLAT_NUMBERS.map((flatNumber) => createFlat(flatNumber));
const getCurrentMonth = () => MONTH_OPTIONS[new Date().getMonth()];
const formatDateLabel = (date) =>
  `${date.getDate()} ${MONTH_OPTIONS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
const formatTimestamp = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const normalizeSavedFlats = (savedFlats) => {
  if (!Array.isArray(savedFlats)) return createDefaultFlats();

  const byFlatNumber = new Map();
  savedFlats.forEach((flat) => {
    const key = typeof flat?.flatNumber === "string" ? flat.flatNumber.trim().toUpperCase() : "";
    if (!key) return;
    byFlatNumber.set(key, flat);
  });

  return DEFAULT_FLAT_NUMBERS.map((flatNumber) => {
    const saved = byFlatNumber.get(flatNumber.toUpperCase());
    if (!saved) return createFlat(flatNumber);

    return {
      id:
        typeof saved.id === "string" && saved.id
          ? saved.id
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      flatNumber,
      minutes: typeof saved.minutes === "string" ? saved.minutes : "",
      maintenance: typeof saved.maintenance === "string" ? saved.maintenance : "",
      isActive: typeof saved.isActive === "boolean" ? saved.isActive : true
    };
  });
};

const App = () => {
  const [monthLabel, setMonthLabel] = useState(getCurrentMonth());
  const [maintainedByFlat, setMaintainedByFlat] = useState("");
  const [finalPaymentDate, setFinalPaymentDate] = useState("");
  const [payTo, setPayTo] = useState("");
  const [tankers, setTankers] = useState("");
  const [pricePerTanker, setPricePerTanker] = useState("");
  const [currentWaterBill, setCurrentWaterBill] = useState("");
  const [globalMaintenance, setGlobalMaintenance] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState("global");
  const [flats, setFlats] = useState(createDefaultFlats());
  const [isHydrated, setIsHydrated] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("Not checked yet");
  const [lastUpdateCheck, setLastUpdateCheck] = useState("");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const saveTimeoutRef = useRef(null);
  const billShotRef = useRef(null);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setIsHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          setIsHydrated(true);
          return;
        }

        setTankers(typeof parsed.tankers === "string" ? parsed.tankers : "");
        setMonthLabel(typeof parsed.monthLabel === "string" ? parsed.monthLabel : "");
        setMaintainedByFlat(
          typeof parsed.maintainedByFlat === "string" ? parsed.maintainedByFlat : ""
        );
        setFinalPaymentDate(
          typeof parsed.finalPaymentDate === "string" ? parsed.finalPaymentDate : ""
        );
        setPayTo(typeof parsed.payTo === "string" ? parsed.payTo : "");
        setPricePerTanker(
          typeof parsed.pricePerTanker === "string" ? parsed.pricePerTanker : ""
        );
        setCurrentWaterBill(
          typeof parsed.currentWaterBill === "string" ? parsed.currentWaterBill : ""
        );
        setGlobalMaintenance(
          typeof parsed.globalMaintenance === "string" ? parsed.globalMaintenance : ""
        );
        setMaintenanceMode(
          parsed.maintenanceMode === "perFlat" ? "perFlat" : "global"
        );
        setFlats(normalizeSavedFlats(parsed.flats));
      } catch (error) {
        setFlats(createDefaultFlats());
      } finally {
        setIsHydrated(true);
      }
    };

    loadSavedData();
  }, []);

  useEffect(() => {
    if (!isHydrated) return undefined;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = {
        monthLabel,
        maintainedByFlat,
        finalPaymentDate,
        payTo,
        tankers,
        pricePerTanker,
        currentWaterBill,
        globalMaintenance,
        maintenanceMode,
        flats
      };

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        // Ignore persistence failures to keep calculations functional.
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    monthLabel,
    maintainedByFlat,
    finalPaymentDate,
    payTo,
    tankers,
    pricePerTanker,
    currentWaterBill,
    globalMaintenance,
    maintenanceMode,
    flats,
    isHydrated
  ]);

  const computed = useMemo(() => {
    const tankerCountNum = toNumber(tankers);
    const pricePerTankerNum = toNumber(pricePerTanker);
    const currentWaterBillNum = toNumber(currentWaterBill);
    const globalMaintenanceNum = toNumber(globalMaintenance);

    const totalWaterCost = tankerCountNum * pricePerTankerNum + currentWaterBillNum;
    const totalMinutes = flats.reduce(
      (sum, flat) => (flat.isActive ? sum + toNumber(flat.minutes) : sum),
      0
    );
    const perMinuteCost = totalMinutes > 0 ? totalWaterCost / totalMinutes : 0;
    const activeFlatsCount = flats.reduce(
      (sum, flat) => (flat.isActive ? sum + 1 : sum),
      0
    );

    const perFlat = flats.map((flat) => {
      const minutesNum = toNumber(flat.minutes);
      const waterAmount = flat.isActive ? minutesNum * perMinuteCost : 0;
      const maintenanceAmount = flat.isActive
        ? maintenanceMode === "perFlat"
          ? toNumber(flat.maintenance)
          : globalMaintenanceNum
        : 0;
      const total = flat.isActive ? waterAmount + maintenanceAmount : 0;

      return {
        id: flat.id,
        flatNumber: flat.flatNumber,
        isActive: flat.isActive,
        minutes: flat.isActive ? minutesNum : 0,
        waterAmount,
        maintenanceAmount,
        total
      };
    });

    const totalMaintenance = perFlat.reduce(
      (sum, row) => sum + row.maintenanceAmount,
      0
    );
    const grandTotal = perFlat.reduce((sum, row) => sum + row.total, 0);
    const activeRows = perFlat.filter((row) => row.isActive);

    return {
      totalWaterCost,
      totalMinutes,
      perMinuteCost,
      activeFlatsCount,
      totalMaintenance,
      grandTotal,
      perFlat,
      activeRows
    };
  }, [
    tankers,
    pricePerTanker,
    currentWaterBill,
    globalMaintenance,
    flats,
    maintenanceMode
  ]);

  const buildInfo = useMemo(
    () => ({
      appVersion: Constants.expoConfig?.version || "-",
      runtimeVersion: Updates.runtimeVersion || "-",
      updateId: Updates.updateId || "embedded",
      channel: Updates.channel || "not set",
      launchType: Updates.isEmbeddedLaunch ? "Embedded bundle" : "EAS update",
      launchedAt: formatTimestamp(Updates.createdAt)
    }),
    []
  );

  const handleFlatChange = (id, key, value) => {
    setFlats((current) =>
      current.map((flat) => (flat.id === id ? { ...flat, [key]: value } : flat))
    );
  };

  const toggleFlatActive = (id, isActive) => {
    setFlats((current) =>
      current.map((flat) => (flat.id === id ? { ...flat, isActive } : flat))
    );
  };

  const restoreDefaultFlats = () => {
    setFlats(createDefaultFlats());
  };

  const onDueDateChange = (_, selectedDate) => {
    setShowDatePicker(false);
    if (!selectedDate) return;
    setFinalPaymentDate(formatDateLabel(selectedDate));
  };

  const resetMonth = async () => {
    const reset = createDefaultFlats();
    setMonthLabel(getCurrentMonth());
    setMaintainedByFlat("");
    setFinalPaymentDate("");
    setPayTo("");
    setTankers("");
    setPricePerTanker("");
    setCurrentWaterBill("");
    setGlobalMaintenance("");
    setMaintenanceMode("global");
    setFlats(reset);

    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          monthLabel: "",
          maintainedByFlat: "",
          finalPaymentDate: "",
          payTo: "",
          tankers: "",
          pricePerTanker: "",
          currentWaterBill: "",
          globalMaintenance: "",
          maintenanceMode: "global",
          flats: reset
        })
      );
    } catch (error) {
      // Ignore reset persistence failures.
    }
  };

  const downloadBillImage = async () => {
    try {
      if (Platform.OS === "web") {
        const rowCount = computed.activeRows.length;
        const width = 1240;
        const topAreaHeight = 350;
        const rowHeight = 44;
        const footerHeight = 190;
        const height = topAreaHeight + rowCount * rowHeight + footerHeight;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          Alert.alert("Error", "Could not create image.");
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        const left = 42;
        const contentWidth = width - left * 2;

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 42px Arial";
        ctx.fillText("MONTHLY WATER BILL", left, 58);

        ctx.fillStyle = "#475569";
        ctx.font = "500 22px Arial";
        ctx.fillText(`Month: ${monthLabel.trim() || "-"}`, left, 96);

        const boxTop = 122;
        const boxHeight = 182;
        const boxGap = 24;
        const boxWidth = (contentWidth - boxGap) / 2;

        const drawBox = (x, title) => {
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(x, boxTop, boxWidth, boxHeight);
          ctx.strokeStyle = "#dbe3ee";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, boxTop, boxWidth, boxHeight);

          ctx.fillStyle = "#0f172a";
          ctx.font = "700 24px Arial";
          ctx.fillText(title, x + 14, boxTop + 34);
        };

        drawBox(left, "Water Cost");
        drawBox(left + boxWidth + boxGap, "Usage Summary");

        ctx.fillStyle = "#1e293b";
        ctx.font = "500 21px Arial";
        ctx.fillText(`Tankers: ${toNumber(tankers)}`, left + 16, boxTop + 72);
        ctx.fillText(
          `Price/Tanker: Rs ${toNumber(pricePerTanker)}`,
          left + 16,
          boxTop + 104
        );
        ctx.fillText(
          `Current Bill: Rs ${roundRupee(toNumber(currentWaterBill))}`,
          left + 16,
          boxTop + 136
        );
        ctx.fillText(
          `Total Water Cost: Rs ${roundRupee(computed.totalWaterCost)}`,
          left + 16,
          boxTop + 168
        );

        const rightBoxX = left + boxWidth + boxGap + 16;
        ctx.fillText(`Total Minutes: ${computed.totalMinutes}`, rightBoxX, boxTop + 72);
        ctx.fillText(
          `Per Minute: Rs ${formatPerMinute(computed.perMinuteCost)}`,
          rightBoxX,
          boxTop + 104
        );
        ctx.fillText(
          `Active Flats: ${computed.activeFlatsCount}`,
          rightBoxX,
          boxTop + 136
        );
        ctx.fillText(
          `Maintained By: Flat ${maintainedByFlat.trim() || "-"}`,
          rightBoxX,
          boxTop + 168
        );

        const yStart = boxTop + boxHeight + 46;
        const xFlat = left + 10;
        const xMin = left + 280;
        const xWater = left + 490;
        const xMaint = left + 710;
        const xTotal = left + 940;

        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(left, yStart - 32, contentWidth, 42);

        ctx.fillStyle = "#0f172a";
        ctx.font = "700 22px Arial";
        ctx.fillText("Flat No", xFlat, yStart);
        ctx.fillText("Minutes", xMin, yStart);
        ctx.fillText("Water Amt", xWater, yStart);
        ctx.fillText("Maint", xMaint, yStart);
        ctx.fillText("Total", xTotal, yStart);

        let y = yStart + 36;
        ctx.font = "500 21px Arial";
        computed.activeRows.forEach((row) => {
          const isStriped = Math.floor((y - yStart) / rowHeight) % 2 === 1;
          if (isStriped) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(left, y - 28, contentWidth, rowHeight);
          }
          ctx.fillStyle = "#111827";
          ctx.fillText(String(row.flatNumber), xFlat, y);
          ctx.fillText(String(row.minutes), xMin, y);
          ctx.fillText(String(roundRupee(row.waterAmount)), xWater, y);
          ctx.fillText(String(roundRupee(row.maintenanceAmount)), xMaint, y);
          ctx.fillText(String(roundRupee(row.total)), xTotal, y);
          y += rowHeight;
        });

        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(left, y - 26, contentWidth, 46);
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 22px Arial";
        ctx.fillText("Grand Total", xFlat, y + 6);
        ctx.fillText(String(computed.totalMinutes), xMin, y + 6);
        ctx.fillText(String(roundRupee(computed.totalWaterCost)), xWater, y + 6);
        ctx.fillText(String(roundRupee(computed.totalMaintenance)), xMaint, y + 6);
        ctx.fillText(String(roundRupee(computed.grandTotal)), xTotal, y + 6);

        ctx.fillStyle = "#475569";
        ctx.font = "500 19px Arial";
        ctx.fillText(`Final Payment Date: ${finalPaymentDate.trim() || "-"}`, left, y + 64);
        ctx.fillText(`Pay To: ${payTo.trim() || "-"}`, left + 560, y + 64);
        ctx.fillText("Generated from Monthly Apartment Bill app", left, y + 104);

        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `water-bill-${(monthLabel || "month").replace(/\s+/g, "-")}.png`;
        link.href = dataUrl;
        link.click();
        Alert.alert("Done", "Bill image downloaded.");
        return;
      }

      const existingPermission = await MediaLibrary.getPermissionsAsync();
      let finalPermission = existingPermission;
      if (!existingPermission.granted) {
        finalPermission = await MediaLibrary.requestPermissionsAsync();
      }
      if (!finalPermission.granted) {
        Alert.alert("Permission Required", "Please allow Photos/Media permission to save image.");
        return;
      }

      const tmpFileUri = await billShotRef.current?.capture?.({
        format: "png",
        quality: 1,
        result: "tmpfile"
      });
      if (!tmpFileUri) {
        throw new Error("capture returned empty file");
      }
      await MediaLibrary.saveToLibraryAsync(tmpFileUri);

      Alert.alert("Done", "Bill image downloaded to gallery.");
    } catch (error) {
      Alert.alert("Error", `Failed to download image. ${error?.message || ""}`);
    }
  };

  const checkForUpdatesNow = async () => {
    if (Platform.OS === "web") {
      setUpdateStatus("Web build: EAS OTA updates are for native app builds.");
      setLastUpdateCheck(formatTimestamp(new Date()));
      return;
    }
    if (__DEV__) {
      setUpdateStatus("Dev mode: OTA checks are disabled. Use a preview/production build.");
      setLastUpdateCheck(formatTimestamp(new Date()));
      return;
    }

    setIsCheckingUpdate(true);
    try {
      setUpdateStatus("Checking for updates...");
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setUpdateStatus("No update available.");
        return;
      }

      await Updates.fetchUpdateAsync();
      setUpdateStatus("Update downloaded. Tap 'Reload App' to apply.");
    } catch (error) {
      setUpdateStatus(`Check failed: ${error?.message || "Unknown error"}`);
    } finally {
      setLastUpdateCheck(formatTimestamp(new Date()));
      setIsCheckingUpdate(false);
    }
  };

  const reloadAppNow = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Web", "Use normal browser refresh on web.");
      return;
    }
    if (__DEV__) {
      Alert.alert("Dev mode", "Reload using Expo dev controls.");
      return;
    }

    try {
      await Updates.reloadAsync();
    } catch (error) {
      Alert.alert("Reload failed", error?.message || "Could not reload app.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Monthly Water Bill</Text>
        <Text style={styles.subtitle}>Apartment Calculator</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Monthly Inputs</Text>
          <Text style={styles.cardDescription}>
            Enter month and bill values. Totals update automatically.
          </Text>
          <Text style={styles.label}>Month</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={monthLabel}
              onValueChange={setMonthLabel}
              accessibilityLabel="Month of maintenance"
              style={styles.picker}
            >
              {MONTH_OPTIONS.map((month) => (
                <Picker.Item key={month} label={month} value={month} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Maintained by flat no.</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={maintainedByFlat}
              onValueChange={setMaintainedByFlat}
              accessibilityLabel="Maintained by flat number"
              style={styles.picker}
            >
              <Picker.Item label="Select flat" value="" />
              {DEFAULT_FLAT_NUMBERS.map((flatNo) => (
                <Picker.Item key={`maint-${flatNo}`} label={flatNo} value={flatNo} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Final payment date</Text>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Select final payment date"
          >
            <Text style={styles.dateButtonText}>
              {finalPaymentDate || "Select date"}
            </Text>
          </Pressable>

          <Text style={styles.label}>Pay to</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={payTo}
              onValueChange={setPayTo}
              accessibilityLabel="Pay to flat number"
              style={styles.picker}
            >
              <Picker.Item label="Select flat" value="" />
              {DEFAULT_FLAT_NUMBERS.map((flatNo) => (
                <Picker.Item key={`pay-${flatNo}`} label={flatNo} value={flatNo} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Number of tankers</Text>
          <TextInput
            value={tankers}
            onChangeText={setTankers}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            accessibilityLabel="Number of tankers"
            style={styles.input}
          />

          <Text style={styles.label}>Price per tanker (Rs)</Text>
          <TextInput
            value={pricePerTanker}
            onChangeText={setPricePerTanker}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            accessibilityLabel="Price per tanker in rupees"
            style={styles.input}
          />

          <Text style={styles.label}>Current water bill (optional, Rs)</Text>
          <TextInput
            value={currentWaterBill}
            onChangeText={setCurrentWaterBill}
            placeholder="0"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            accessibilityLabel="Current water bill"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Maintenance</Text>
          <Text style={styles.cardDescription}>
            Use one common maintenance amount, or switch to per-flat mode.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Per-flat maintenance mode</Text>
            <Switch
              value={maintenanceMode === "perFlat"}
              onValueChange={(value) =>
                setMaintenanceMode(value ? "perFlat" : "global")
              }
              accessibilityLabel="Toggle per-flat maintenance mode"
            />
          </View>

          {maintenanceMode === "global" ? (
            <>
              <Text style={styles.label}>Maintenance per flat (Rs)</Text>
              <TextInput
                value={globalMaintenance}
                onChangeText={setGlobalMaintenance}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                accessibilityLabel="Maintenance per flat in rupees"
                style={styles.input}
              />
            </>
          ) : (
            <Text style={styles.modeNote}>
              Enter maintenance amount inside each flat row.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Flats</Text>
          <Text style={styles.cardDescription}>
            Keep flats active when occupied. Inactive flats are excluded from totals.
          </Text>
          <Text style={styles.modeNote}>
            Total rows: {flats.length} | Active: {computed.activeFlatsCount}
          </Text>

          {flats.map((flat) => (
            <View
              key={flat.id}
              style={[styles.flatRow, !flat.isActive && styles.flatRowInactive]}
            >
              <View style={styles.flatHeadRow}>
                <Text style={styles.flatHeading}>Flat {flat.flatNumber}</Text>
                <View style={styles.switchRowCompact}>
                  <Text style={styles.switchLabel}>
                    {flat.isActive ? "Active" : "Inactive"}
                  </Text>
                  <Switch
                    value={flat.isActive}
                    onValueChange={(value) => toggleFlatActive(flat.id, value)}
                    accessibilityLabel={`Toggle flat ${flat.flatNumber} active`}
                  />
                </View>
              </View>
              <Text style={styles.label}>Minutes used</Text>
              <TextInput
                value={flat.minutes}
                onChangeText={(value) => handleFlatChange(flat.id, "minutes", value)}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                editable={flat.isActive}
                accessibilityLabel={`Minutes used for flat ${flat.flatNumber}`}
                style={[styles.input, !flat.isActive && styles.inputDisabled]}
              />
              {maintenanceMode === "perFlat" ? (
                <>
                  <Text style={styles.label}>Maintenance (Rs)</Text>
                  <TextInput
                    value={flat.maintenance}
                    onChangeText={(value) =>
                      handleFlatChange(flat.id, "maintenance", value)
                    }
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    editable={flat.isActive}
                    accessibilityLabel={`Maintenance for flat ${flat.flatNumber}`}
                    style={[styles.input, !flat.isActive && styles.inputDisabled]}
                  />
                </>
              ) : null}
            </View>
          ))}

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.buttonPrimary}
              onPress={restoreDefaultFlats}
              accessibilityRole="button"
              accessibilityLabel="Restore all default flats"
            >
              <Text style={styles.buttonText}>Restore Default Flats</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Summary</Text>
          <Text style={styles.summaryLine}>
            Month: {monthLabel.trim() || "-"}
          </Text>
          <Text style={styles.summaryLine}>
            Total Water Cost: Rs {roundRupee(computed.totalWaterCost)}
          </Text>
          <Text style={styles.summaryLine}>Total Minutes: {computed.totalMinutes}</Text>
          <Text style={styles.summaryLine}>
            Per Minute Cost: Rs {formatPerMinute(computed.perMinuteCost)}
          </Text>
          <Text style={styles.summaryLine}>
            Maintained By: Flat {maintainedByFlat.trim() || "-"}
          </Text>
          <Text style={styles.summaryLine}>
            Final Payment Date: {finalPaymentDate.trim() || "-"}
          </Text>
          <Text style={styles.summaryLine}>
            Pay To: {payTo.trim() || "-"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Build & Update Info</Text>
          <Text style={styles.cardDescription}>
            Use this to confirm exactly which app version/update is running.
          </Text>
          <Text style={styles.infoLine}>App Version: {buildInfo.appVersion}</Text>
          <Text style={styles.infoLine}>Runtime Version: {buildInfo.runtimeVersion}</Text>
          <Text style={styles.infoLine}>Channel: {buildInfo.channel}</Text>
          <Text style={styles.infoLine}>Launch Type: {buildInfo.launchType}</Text>
          <Text style={styles.infoLine} selectable>
            Update ID: {buildInfo.updateId}
          </Text>
          <Text style={styles.infoLine}>Launched At: {buildInfo.launchedAt}</Text>
          <Text style={styles.infoLine}>Update Status: {updateStatus}</Text>
          <Text style={styles.infoLine}>Last Checked: {lastUpdateCheck || "-"}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.buttonPrimary, isCheckingUpdate && styles.buttonDisabled]}
              onPress={checkForUpdatesNow}
              accessibilityRole="button"
              accessibilityLabel="Check for app updates now"
              disabled={isCheckingUpdate}
            >
              <Text style={styles.buttonText}>
                {isCheckingUpdate ? "Checking..." : "Check Update Now"}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.buttonRow, styles.secondaryButtonRow]}>
            <Pressable
              style={styles.buttonSecondary}
              onPress={reloadAppNow}
              accessibilityRole="button"
              accessibilityLabel="Reload app to apply update"
            >
              <Text style={styles.buttonSecondaryText}>Reload App</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Flat-wise Breakdown</Text>
          <Text style={styles.cardDescription}>
            Water and maintenance amount per flat.
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colFlat]}>Flat</Text>
            <Text style={[styles.headerCell, styles.colMinutes]}>Min</Text>
            <Text style={[styles.headerCell, styles.colMoney]}>Water</Text>
            <Text style={[styles.headerCell, styles.colMoney]}>Maint</Text>
            <Text style={[styles.headerCell, styles.colMoney]}>Total</Text>
          </View>
          {computed.perFlat.map((row, index) => (
            <View
              key={row.id}
              style={[
                styles.tableRow,
                index % 2 === 1 && styles.tableRowStriped,
                !row.isActive && styles.tableRowInactive
              ]}
            >
              <Text style={[styles.cell, styles.colFlat]} numberOfLines={1}>
                {row.flatNumber}{!row.isActive ? " (off)" : ""}
              </Text>
              <Text style={[styles.cell, styles.colMinutes]}>{row.minutes}</Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {roundRupee(row.waterAmount)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {roundRupee(row.maintenanceAmount)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {roundRupee(row.total)}
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.tableFooter]}>
            <Text style={[styles.cell, styles.colFlat, styles.footerText]}>TOTAL</Text>
            <Text style={[styles.cell, styles.colMinutes, styles.footerText]}>
              {computed.totalMinutes}
            </Text>
            <Text style={[styles.cell, styles.colMoney, styles.footerText]}>
              {roundRupee(computed.totalWaterCost)}
            </Text>
            <Text style={[styles.cell, styles.colMoney, styles.footerText]}>
              {roundRupee(computed.totalMaintenance)}
            </Text>
            <Text style={[styles.cell, styles.colMoney, styles.footerText]}>
              {roundRupee(computed.grandTotal)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Download Bill Image</Text>
          <Text style={styles.cardDescription}>
            Generate a PNG image of the bill for sharing in WhatsApp.
          </Text>
          <ViewShot
            ref={billShotRef}
            collapsable={false}
            options={{ format: "png", quality: 1, result: "tmpfile" }}
            style={styles.billShot}
          >
            <Text style={styles.billTitle}>MONTHLY WATER BILL</Text>
            <Text style={styles.billMetaLarge}>Month: {monthLabel.trim() || "-"}</Text>

            <View style={styles.billSummaryRow}>
              <View style={styles.billSummaryCard}>
                <Text style={styles.billSummaryTitle}>Water Cost</Text>
                <Text style={styles.billMetaLine}>Tankers: {toNumber(tankers)}</Text>
                <Text style={styles.billMetaLine}>
                  Price/Tanker: Rs {toNumber(pricePerTanker)}
                </Text>
                <Text style={styles.billMetaLine}>
                  Current Bill: Rs {roundRupee(toNumber(currentWaterBill))}
                </Text>
                <Text style={styles.billMetaLine}>
                  Total Water Cost: Rs {roundRupee(computed.totalWaterCost)}
                </Text>
              </View>
              <View style={styles.billSummaryCard}>
                <Text style={styles.billSummaryTitle}>Usage Summary</Text>
                <Text style={styles.billMetaLine}>Total Minutes: {computed.totalMinutes}</Text>
                <Text style={styles.billMetaLine}>
                  Per Minute: Rs {formatPerMinute(computed.perMinuteCost)}
                </Text>
                <Text style={styles.billMetaLine}>
                  Active Flats: {computed.activeFlatsCount}
                </Text>
                <Text style={styles.billMetaLine}>
                  Maintained By: Flat {maintainedByFlat.trim() || "-"}
                </Text>
              </View>
            </View>

            <View style={styles.billHeaderRow}>
              <Text style={[styles.billHeadCell, styles.billColFlat]}>Flat No</Text>
              <Text style={[styles.billHeadCell, styles.billColMin]}>Minutes</Text>
              <Text style={[styles.billHeadCell, styles.billColMoney]}>Water Amt</Text>
              <Text style={[styles.billHeadCell, styles.billColMoney]}>Maint</Text>
              <Text style={[styles.billHeadCell, styles.billColMoney]}>Total</Text>
            </View>
            {computed.activeRows.map((row, index) => (
              <View
                key={`bill-${row.id}`}
                style={[styles.billRow, index % 2 === 1 && styles.billRowStriped]}
              >
                <Text style={[styles.billCell, styles.billColFlat]}>{row.flatNumber}</Text>
                <Text style={[styles.billCell, styles.billColMin]}>{row.minutes}</Text>
                <Text style={[styles.billCell, styles.billColMoney]}>
                  {roundRupee(row.waterAmount)}
                </Text>
                <Text style={[styles.billCell, styles.billColMoney]}>
                  {roundRupee(row.maintenanceAmount)}
                </Text>
                <Text style={[styles.billCell, styles.billColMoney]}>
                  {roundRupee(row.total)}
                </Text>
              </View>
            ))}

            <View style={styles.billTotalRow}>
              <Text style={[styles.billTotalCell, styles.billColFlat]}>Grand Total</Text>
              <Text style={[styles.billTotalCell, styles.billColMin]}>
                {computed.totalMinutes}
              </Text>
              <Text style={[styles.billTotalCell, styles.billColMoney]}>
                {roundRupee(computed.totalWaterCost)}
              </Text>
              <Text style={[styles.billTotalCell, styles.billColMoney]}>
                {roundRupee(computed.totalMaintenance)}
              </Text>
              <Text style={[styles.billTotalCell, styles.billColMoney]}>
                {roundRupee(computed.grandTotal)}
              </Text>
            </View>

            <View style={styles.billFooterMetaRow}>
              <Text style={styles.billFooterLine}>
                Final Payment Date: {finalPaymentDate.trim() || "-"}
              </Text>
              <Text style={styles.billFooterLine}>
                Pay To: {payTo.trim() || "-"}
              </Text>
            </View>
            <Text style={styles.billGeneratedNote}>
              Generated from Monthly Apartment Bill app
            </Text>
          </ViewShot>

          <Pressable
            style={styles.buttonPrimary}
            onPress={downloadBillImage}
            accessibilityRole="button"
            accessibilityLabel="Download bill image as PNG"
          >
            <Text style={styles.buttonText}>Download Image</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.resetButton}
          onPress={resetMonth}
          accessibilityRole="button"
          accessibilityLabel="Reset month values"
        >
          <Text style={styles.resetText}>Reset Month</Text>
        </Pressable>
      </ScrollView>
      {showDatePicker ? (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDueDateChange}
        />
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2f7"
  },
  container: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingBottom: 92
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 42
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 18,
    color: "#334155",
    textAlign: "center",
    lineHeight: 24
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dbe3ee"
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 21,
    color: "#475569",
    marginBottom: 12
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    marginBottom: 14,
    fontSize: 20,
    color: "#0f172a"
  },
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    marginBottom: 14,
    overflow: "hidden"
  },
  picker: {
    height: 56,
    color: "#0f172a"
  },
  dateButton: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    marginBottom: 14,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  dateButtonText: {
    fontSize: 20,
    color: "#0f172a"
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10
  },
  modeNote: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 8
  },
  flatHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  switchRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155"
  },
  flatRow: {
    borderWidth: 1,
    borderColor: "#dce6f3",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f9fbfd"
  },
  flatRowInactive: {
    opacity: 0.65,
    backgroundColor: "#f1f5f9"
  },
  flatHeading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 0
  },
  inputDisabled: {
    backgroundColor: "#e5e7eb"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: "#1d4ed8",
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  buttonSecondaryText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  secondaryButtonRow: {
    marginTop: 10
  },
  summaryLine: {
    fontSize: 19,
    color: "#0f172a",
    marginBottom: 8
  },
  infoLine: {
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 6
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d2dce8",
    paddingBottom: 8,
    marginBottom: 8
  },
  headerCell: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: 0.3
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7"
  },
  tableRowStriped: {
    backgroundColor: "#f8fafc"
  },
  tableRowInactive: {
    opacity: 0.65
  },
  tableFooter: {
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderBottomWidth: 0,
    marginTop: 2
  },
  cell: {
    fontSize: 15,
    color: "#0f172a"
  },
  footerText: {
    fontWeight: "700"
  },
  colFlat: {
    flex: 1.2
  },
  colMinutes: {
    flex: 0.9,
    textAlign: "right"
  },
  colMoney: {
    flex: 1,
    textAlign: "right"
  },
  billShot: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  billTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "left",
    marginBottom: 6
  },
  billMetaLarge: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 12
  },
  billSummaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  billSummaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 8
  },
  billSummaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4
  },
  billMetaLine: {
    fontSize: 10,
    color: "#1e293b",
    marginBottom: 2
  },
  billHeaderRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 2
  },
  billHeadCell: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#111827"
  },
  billColFlat: {
    flex: 1.25
  },
  billColMin: {
    flex: 1,
    textAlign: "center"
  },
  billColMoney: {
    flex: 1.05,
    textAlign: "center"
  },
  billRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 2
  },
  billRowStriped: {
    backgroundColor: "#f8fafc"
  },
  billCell: {
    fontSize: 8.8,
    color: "#111827"
  },
  billTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderColor: "#93c5fd",
    backgroundColor: "#dbeafe",
    marginTop: 4,
    paddingVertical: 7,
    paddingHorizontal: 2
  },
  billTotalCell: {
    fontSize: 9.2,
    fontWeight: "700",
    color: "#0f172a"
  },
  billFooterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10
  },
  billFooterLine: {
    fontSize: 9.8,
    color: "#475569",
    flex: 1
  },
  billGeneratedNote: {
    fontSize: 9.2,
    color: "#64748b",
    marginTop: 6
  },
  resetButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center"
  },
  resetText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700"
  }
});

export default App;
