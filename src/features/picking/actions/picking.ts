"use server";

import { getGoogleSheetsClient, SHEET_ID } from "@/server/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function getSheetData(range: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });
    return response.data.values || [];
  } catch (e) {
    console.error("Error fetching sheet data:", e);
    return [];
  }
}

export async function getProductMasterData() {
  const rows = await getSheetData("Products!A:D");
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    sku: (row[0] || "").toString().trim(),
    name: (row[1] || "").toString().trim(),
    specs: row[2], 
    weight: row[3] 
  }));
}

export async function getSupermarketMasterData() {
  try {
    const rows = await getSheetData("Supermarkets!A:B");
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      code: (row[0] || "").toString().trim(),
      name: (row[1] || "").toString().trim()
    }));
  } catch (e) {
    return [];
  }
}

export async function savePickingSessions(weekKey: string, pickingDate: string, sessions: { supermarket: string, items: { productName: string, quantity: number }[] }[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    const products = await getProductMasterData();
    const masterSupermarkets = await getSupermarketMasterData();
    const createdAt = new Date().toISOString();
    
    const itemHeaders = ["ID", "SessionID", "SupermarketCode", "Supermarket", "ProductName", "Quantity", "SKU", "Specs", "UnitWeight(g)", "ActualQty", "IsPicked", "TotalWeight(kg)", "Packages", "PickingDate"];
    const sessionHeaders = ["ID", "WeekKey", "Supermarket", "Status", "CreatedAt", "PickingDate"];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: "Items!A1:N1", valueInputOption: "RAW", requestBody: { values: [itemHeaders] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: "Sessions!A1:F1", valueInputOption: "RAW", requestBody: { values: [sessionHeaders] },
    });

    const sessionRows: any[] = [];
    const itemRows: any[] = [];

    const normalize = (text: string) => 
      text?.toString().replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim().toLowerCase() || "";

    for (const sessionData of sessions) {
      const sessionId = uuidv4();
      const normalizedExcelSupermarket = normalize(sessionData.supermarket);
      const matchedSM = masterSupermarkets.find(s => normalize(s.name) === normalizedExcelSupermarket);
      const finalSupermarketCode = matchedSM ? matchedSM.code : "";
      const finalSupermarketName = matchedSM ? matchedSM.name : sessionData.supermarket;

      sessionRows.push([sessionId, weekKey, finalSupermarketName, "PENDING", createdAt, pickingDate]);

      sessionData.items.forEach(item => {
        const normalizedExcelName = normalize(item.productName);
        const masterProd = products.find(p => normalize(p.name) === normalizedExcelName);
        const finalProductName = masterProd ? masterProd.name : item.productName;
        
        let calculatedWeightKg = 0;
        let packages = 0;
        const specs = parseFloat(masterProd?.specs || "1");
        const unitWeightGram = parseFloat(masterProd?.weight || "0");

        if (!isNaN(specs) && specs > 0) {
          packages = parseFloat((item.quantity / specs).toFixed(2));
          if (!isNaN(unitWeightGram)) {
            calculatedWeightKg = parseFloat(((packages * unitWeightGram) / 1000).toFixed(2));
          }
        }

        itemRows.push([
          uuidv4(), sessionId, finalSupermarketCode, finalSupermarketName, finalProductName, item.quantity,
          (masterProd?.sku || ""), (masterProd?.specs || ""), (masterProd?.weight || ""), "", "FALSE", calculatedWeightKg, packages, pickingDate
        ]);
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Sessions!A:F", valueInputOption: "RAW", requestBody: { values: sessionRows },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Items!A:N", valueInputOption: "RAW", requestBody: { values: itemRows },
    });

    revalidatePath("/picking");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Cập nhật Item và tự động tính toán Status cho Session
export async function updatePickingItem(itemId: string, sessionId: string, actualQty: number | string, isPicked: boolean) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // 1. Cập nhật Item trước
    const itemRows = await getSheetData("Items!A:A");
    const itemRowIndex = itemRows.findIndex(row => (row[0] || "").toString().trim() === itemId.trim());
    if (itemRowIndex === -1) throw new Error("Item not found");

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Items!J${itemRowIndex + 1}:K${itemRowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[actualQty, isPicked ? "TRUE" : "FALSE"]] },
    });

    // 2. Lấy tất cả items của session này để tính toán trạng thái tự động
    const allItemsOfSession = await getSheetData("Items!A:K");
    const sessionItems = allItemsOfSession.filter(row => (row[1] || "").toString().trim() === sessionId.trim());
    
    const totalItems = sessionItems.length;
    const pickedItems = sessionItems.filter(row => (row[10] || "").toString().toUpperCase() === "TRUE").length;
    
    let newStatus = "PENDING";
    if (pickedItems === totalItems && totalItems > 0) {
      newStatus = "COMPLETED";
    } else if (pickedItems > 0) {
      newStatus = "PROCESSING";
    }

    // 3. Cập nhật Session Status
    const sessionRows = await getSheetData("Sessions!A:A");
    const sessionRowIndex = sessionRows.findIndex(row => (row[0] || "").toString().trim() === sessionId.trim());
    
    if (sessionRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sessions!D${sessionRowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [[newStatus]] },
      });
    }

    revalidatePath("/picking");
    return { success: true, newStatus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(id: string, status: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const rows = await getSheetData("Sessions!A:A");
    const rowIndex = rows.findIndex(row => (row[0] || "").toString().trim() === id.trim());
    if (rowIndex === -1) throw new Error("Session not found");
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `Sessions!D${rowIndex + 1}`, valueInputOption: "RAW", requestBody: { values: [[status]] },
    });

    revalidatePath("/picking");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSessions() {
  try {
    const sessionRows = await getSheetData("Sessions!A:F");
    const itemRows = await getSheetData("Items!A:N");
    
    const sessionsData = (sessionRows.length > 0 && (sessionRows[0][0] || "").toString().toUpperCase() === "ID") 
      ? sessionRows.slice(1) : sessionRows;
    const itemsData = (itemRows.length > 0 && (itemRows[0][0] || "").toString().toUpperCase() === "ID") 
      ? itemRows.slice(1) : itemRows;

    return sessionsData.map(row => {
      const sessionId = (row[0] || "").toString().trim();
      return {
        id: sessionId, 
        weekKey: row[1], 
        supermarket: (row[2] || "N/A"), 
        status: (row[3] || "PENDING"), 
        createdAt: row[4], 
        pickingDate: row[5] || "",
        items: itemsData
          .filter(item => (item[1] || "").toString().trim() === sessionId)
          .map(item => ({
            id: (item[0] || "").toString().trim(), 
            supermarketCode: item[2], 
            supermarket: item[3], 
            productName: (item[4] || "Unknown"), 
            quantity: parseInt(item[5] || "0"),
            sku: item[6], 
            specs: item[7], 
            weight: item[8], 
            actualQty: item[9], 
            isPicked: (item[10] || "").toString().toUpperCase() === "TRUE",
            totalWeightKg: item[11], 
            packages: item[12], 
            pickingDate: item[13]
          }))
      };
    });
  } catch (error) {
    console.error("Error in getSessions:", error);
    return [];
  }
}
