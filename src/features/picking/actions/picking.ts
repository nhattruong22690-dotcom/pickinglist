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
  const rows = await getSheetData("Products!A:F");
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    sku: (row[0] || "").toString().trim(),
    name: (row[1] || "").toString().trim(),
    specs: row[2], 
    weight: row[3],
    barcode: (row[5] || "").toString().trim() // Column F
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
    
    // CHUẨN HÓA WEEK KEY SANG CHỮ HOA
    const finalWeekKey = weekKey.toString().toUpperCase().trim();

    const itemHeaders = ["ID", "SessionID", "SupermarketCode", "Supermarket", "ProductName", "Quantity", "SKU", "Specs", "UnitWeight(g)", "ActualQty", "IsPicked", "TotalWeight(kg)", "Packages", "PickingDate", "Barcode"];
    const sessionHeaders = ["ID", "WeekKey", "Supermarket", "Status", "CreatedAt", "PickingDate"];
    const batchHeaders = ["ID", "ItemID", "SessionID", "Quantity", "ExpiryDate", "CreatedAt"];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: "Items!A1:O1", valueInputOption: "RAW", requestBody: { values: [itemHeaders] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: "Sessions!A1:F1", valueInputOption: "RAW", requestBody: { values: [sessionHeaders] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID, range: "ItemBatches!A1:F1", valueInputOption: "RAW", requestBody: { values: [batchHeaders] },
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

      sessionRows.push([sessionId, finalWeekKey, finalSupermarketName, "PENDING", createdAt, pickingDate]);

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
          (masterProd?.sku || ""), (masterProd?.specs || ""), (masterProd?.weight || ""), "", "FALSE", calculatedWeightKg, packages, pickingDate, (masterProd?.barcode || "")
        ]);
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Sessions!A:F", valueInputOption: "RAW", requestBody: { values: sessionRows },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, range: "Items!A:O", valueInputOption: "RAW", requestBody: { values: itemRows },
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

export async function addBatch(itemId: string, sessionId: string, qty: number, expiryDate: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const batchId = uuidv4();
    const createdAt = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "ItemBatches!A:F",
      valueInputOption: "RAW",
      requestBody: {
        values: [[batchId, itemId, sessionId, qty, expiryDate, createdAt]]
      }
    });

    // Cập nhật lại tổng số lượng đã soạn của Item
    const allBatchesRaw = await getSheetData("ItemBatches!A:D");
    const batchesData = (allBatchesRaw.length > 0 && (allBatchesRaw[0][0] || "").toString().toUpperCase() === "ID")
      ? allBatchesRaw.slice(1) : allBatchesRaw;

    const itemBatches = batchesData.filter(row => (row[1] || "").toString().trim() === itemId.trim());
    const totalActualQty = itemBatches.reduce((sum, row) => sum + (parseInt(row[3]) || 0), 0);

    // Lấy thông tin Item để biết Qty cần thiết
    const allItemsRaw = await getSheetData("Items!A:F");
    const itemsData = (allItemsRaw.length > 0 && (allItemsRaw[0][0] || "").toString().toUpperCase() === "ID")
      ? allItemsRaw.slice(1) : allItemsRaw;

    const itemRow = itemsData.find(row => (row[0] || "").toString().trim() === itemId.trim());
    const targetQty = itemRow ? parseInt(itemRow[5]) : 0;
    const isFullyPicked = totalActualQty >= targetQty;

    await updatePickingItem(itemId, sessionId, totalActualQty, isFullyPicked);

    revalidatePath("/picking");
    return { success: true, batchId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBatch(batchId: string, itemId: string, sessionId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const rows = await getSheetData("ItemBatches!A:A");
    const rowIndex = rows.findIndex(row => (row[0] || "").toString().trim() === batchId.trim());
    
    if (rowIndex === -1) throw new Error("Batch not found");

    // Google Sheets API doesn't have a direct "delete row" by index easily via values.update
    // We clear it or use batchUpdate to delete dimension
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: (await getSheetId(sheets, "ItemBatches")),
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });

    // Recalculate item total
    const allBatchesRaw = await getSheetData("ItemBatches!A:D");
    const batchesData = (allBatchesRaw.length > 0 && (allBatchesRaw[0][0] || "").toString().toUpperCase() === "ID")
      ? allBatchesRaw.slice(1) : allBatchesRaw;

    const itemBatches = batchesData.filter(row => (row[1] || "").toString().trim() === itemId.trim() && (row[0] || "").toString().trim() !== batchId.trim());
    const totalActualQty = itemBatches.reduce((sum, row) => sum + (parseInt(row[3]) || 0), 0);

    const allItemsRaw = await getSheetData("Items!A:F");
    const itemsData = (allItemsRaw.length > 0 && (allItemsRaw[0][0] || "").toString().toUpperCase() === "ID")
      ? allItemsRaw.slice(1) : allItemsRaw;

    const itemRow = itemsData.find(row => (row[0] || "").toString().trim() === itemId.trim());
    const targetQty = itemRow ? parseInt(itemRow[5]) : 0;
    
    await updatePickingItem(itemId, sessionId, totalActualQty, totalActualQty >= targetQty);

    revalidatePath("/picking");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function getSheetId(sheets: any, title: string) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = spreadsheet.data.sheets.find((s: any) => s.properties.title === title);
  return sheet.properties.sheetId;
}

export async function updateProductBarcode(productName: string, newBarcode: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const rows = await getSheetData("Products!A:B");
    const rowIndex = rows.findIndex(row => (row[1] || "").toString().trim() === productName.trim());
    
    if (rowIndex === -1) {
      throw new Error("Không tìm thấy sản phẩm trong danh sách.");
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Products!F${rowIndex + 1}`, // Cột F
      valueInputOption: "RAW",
      requestBody: { values: [[newBarcode]] },
    });

    revalidatePath("/products");
    revalidatePath("/picking");
    return { success: true };
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
    const itemRows = await getSheetData("Items!A:O");
    const batchRows = await getSheetData("ItemBatches!A:F");
    
    const sessionsData = (sessionRows.length > 0 && (sessionRows[0][0] || "").toString().toUpperCase() === "ID") 
      ? sessionRows.slice(1) : sessionRows;
    const itemsData = (itemRows.length > 0 && (itemRows[0][0] || "").toString().toUpperCase() === "ID") 
      ? itemRows.slice(1) : itemRows;
    const batchesData = (batchRows.length > 0 && (batchRows[0][0] || "").toString().toUpperCase() === "ID")
      ? batchRows.slice(1) : batchRows;

    return sessionsData.map(row => {
      const sessionId = (row[0] || "").toString().trim();
      return {
        id: sessionId, 
        weekKey: (row[1] || "").toString().toUpperCase().trim(),
        supermarket: (row[2] || "N/A"), 
        status: (row[3] || "PENDING"), 
        createdAt: row[4], 
        pickingDate: row[5] || "",
        items: itemsData
          .filter(item => (item[1] || "").toString().trim() === sessionId)
          .map(item => {
            const itemId = (item[0] || "").toString().trim();
            return {
              id: itemId, 
              supermarketCode: item[2], 
              supermarket: item[3], 
              productName: (item[4] || "Unknown"), 
              quantity: parseInt(item[5] || "0"),
              sku: (item[6] || ""), 
              specs: item[7], 
              weight: item[8], 
              actualQty: item[9], 
              isPicked: (item[10] || "").toString().toUpperCase() === "TRUE",
              totalWeightKg: item[11], 
              packages: item[12], 
              pickingDate: item[13],
              barcode: (item[14] || ""),
              batches: batchesData
                .filter(b => (b[1] || "").toString().trim() === itemId)
                .map(b => ({
                  id: b[0],
                  qty: parseInt(b[3] || "0"),
                  expiryDate: b[4],
                  createdAt: b[5]
                }))
            };
          })
      };
    });
  } catch (error) {
    console.error("Error in getSessions:", error);
    return [];
  }
}
