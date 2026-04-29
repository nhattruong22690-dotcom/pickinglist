import pandas as pd
import sys
import io

# Set stdout to use utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    file_path = 'c:/Users/PC/Desktop/antigravity/picking/abc.xlsx'
    df = pd.read_excel(file_path, header=None)
    print("--- FIRST 10 ROWS ---")
    print(df.head(10).to_string())
    print("\n--- SHAPE ---")
    print(df.shape)
except Exception as e:
    print(f"Error: {e}")
