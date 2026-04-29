"use server";

import { getGoogleSheetsClient, SHEET_ID } from "@/server/lib/google-sheets";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

async function getSheetData(range: string) {
  const sheets = await getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return response.data.values || [];
}

export async function getProductMasterData() {
  const rows = await getSheetData("Products!A:D");
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    sku: row[0],
    name: row[1],
    specs: row[2], 
    weight: row[3] 
  }));
}

/**
 * Lấy danh sách siêu thị chuẩn từ sheet "Supermarkets"
 * Cấu trúc: A: Code, B: Name
 */
export async function getSupermarketMasterData() {
  try {
    const rows = await getSheetData("Supermarkets!A:B");
    if (rows.length <= 1) return [];
    return rows.slice(1).map(row => ({
      code: row[0],
      name: row[1]
    }));
  } catch (e) {
    return [];
  }
}

export async function savePickingSessions(weekKey: string, sessions: { supermarket: string, items: { productName: string, quantity: number }[] }[]) {
  try {
    const sheets = await getGoogleSheetsClient();
    const products = await getProductMasterData();
    const masterSupermarkets = await getSupermarketMasterData();
    const createdAt = new Date().toISOString();
    
    // Đảm bảo tiêu đề cột Items
    const headers = ["ID", "SessionID", "Supermarket", "ProductName", "Quantity", "SKU", "Specs", "UnitWeight(g)", "ActualQty", "IsPicked", "TotalWeight(kg)", "Packages"];
    const firstRow = await getSheetData("Items!A1:L1");
    if (firstRow.length === 0 || firstRow[0][0] !== "ID" || firstRow[0].length < headers.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID, range: "Items!A1:L1", valueInputOption: "RAW", requestBody: { values: [headers] },
      });
    }

    const sessionRows: any[] = [];
    const itemRows: any[] = [];

    const normalize = (text: string) => 
      text?.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim().toLowerCase() || "";

    for (const sessionData of sessions) {
      const sessionId = uuidv4();
      
      // ĐỒNG BỘ TÊN SIÊU THỊ: Ưu tiên lấy từ master "Supermarkets" (Cột B: Name)
      const normalizedExcelSupermarket = normalize(sessionData.supermarket);
      const matched = masterSupermarkets.find(s => normalize(s.name) === normalizedExcelSupermarket);
      const finalSupermarketName = matched ? matched.name : sessionData.supermarket;

      sessionRows.push([sessionId, weekKey, finalSupermarketName, "PENDING", createdAt]);

      sessionData.items.forEach(item => {
        const normalizedExcelName = normalize(item.productName);
        const master = products.find(p => normalize(p.name) === normalizedExcelName);
        
        const finalProductName = master ? master.name : item.productName;
        
        let calculatedWeightKg = 0;
        let packages = 0;
        const specs = parseFloat(master?.specs || "1");
        const unitWeightGram = parseFloat(master?.weight || "0");

        if (!isNaN(specs) && specs > 0) {
          packages = parseFloat((item.quantity / specs).toFixed(2));
          if (!isNaN(unitWeightGram)) {
            calculatedWeightKg = parseFloat(((packages * unitWeightGram) / 1000).toFixed(2));
          }
        }

        itemRows.push([
          uuidv4(), sessionId, finalSupermarketName, finalProductName, item.quantity,
          master?.sku || "", master?.specs || "", master?.weight || "", 
          "", "FALSE", calculatedWeightKg, packages
        ]);
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Sessions!A:E", valueInputOption: "RAW", requestBody: { values: sessionRows },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Items!A:L", valueInputOption: "RAW", requestBody: { values: itemRows },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePickingItem(itemId: string, sessionId: string, actualQty: number | string, isPicked: boolean) {
  try {
    const sheets = await getGoogleSheetsClient();
    const itemRows = await getSheetData("Items!A:A");
    const itemRowIndex = itemRows.findIndex(row => row[0] === itemId);
    if (itemRowIndex === -1) throw new Error("Item not found");

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Items!I${itemRowIndex + 1}:J${itemRowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[actualQty, isPicked ? "TRUE" : "FALSE"]] },
    });

    const sessionRows = await getSheetData("Sessions!A:D");
    const sessionRowIndex = sessionRows.findIndex(row => row[0] === sessionId);
    if (sessionRowIndex !== -1 && sessionRows[sessionRowIndex][3] === "PENDING") {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID, range: `Sessions!D${sessionRowIndex + 1}`, valueInputOption: "RAW", requestBody: { values: [["PROCESSING"]] },
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSessionStatus(id: string, status: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const rows = await getSheetData("Sessions!A:A");
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) throw new Error("Session not found");
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: `Sessions!D${rowIndex + 1}`, valueInputOption: "RAW", requestBody: { values: [[status]] },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSessions() {
  try {
    const sessionRows = await getSheetData("Sessions!A:E");
    const itemRows = await getSheetData("Items!A:L");
    const sessionsData = sessionRows[0]?.[0] === "ID" ? sessionRows.slice(1) : sessionRows;
    const itemsData = itemRows[0]?.[0] === "ID" ? itemRows.slice(1) : itemRows;

    return sessionsData.map(row => ({
      id: row[0], weekKey: row[1], supermarket: row[2], status: row[3], createdAt: row[4],
      items: itemsData.filter(item => item[1] === row[0]).map(item => ({
        id: item[0], productName: item[3], quantity: parseInt(item[4]),
        sku: item[5], specs: item[6], weight: item[7], 
        actualQty: item[8], isPicked: item[9] === "TRUE",
        totalWeightKg: item[10],
        packages: item[11]
      }))
    }));
  } catch (error) {
    return [];
  }
}
