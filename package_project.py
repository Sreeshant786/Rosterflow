import zipfile
import os

zip_path = os.path.abspath("../rosterflow-production-package.zip")
exclude = {"node_modules", ".git", "__pycache__", ".pytest_cache", ".tmp"}

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in exclude]
        for file in files:
            if file.endswith((".db-journal", ".sqlite3-journal")):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, ".")
            try:
                zipf.write(file_path, arcname)
            except Exception as e:
                print(f"Skipping {file}: {e}")

print(f"SUCCESS: Package created at {zip_path} (Size: {os.path.getsize(zip_path):,} bytes)")
