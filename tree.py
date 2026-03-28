import os

def generate_tree(dir_path, prefix="", ignore_dirs=None):
    if ignore_dirs is None:
        ignore_dirs = {'.git', 'node_modules', 'target', 'build', '__pycache__', '.venv', '.vscode', '.idea', 'venv', 'dist'}

    result = []
    try:
        entries = os.listdir(dir_path)
    except PermissionError:
        return result

    dirs = []
    files = []
    for e in entries:
        full_path = os.path.join(dir_path, e)
        if os.path.isdir(full_path):
            if e not in ignore_dirs:
                dirs.append(e)
        else:
            files.append(e)
            
    dirs.sort()
    files.sort()
    
    entries = dirs + files
    for i, e in enumerate(entries):
        is_last = (i == len(entries) - 1)
        result.append(f"{prefix}{'└── ' if is_last else '├── '}{e}")
        
        full_path = os.path.join(dir_path, e)
        if os.path.isdir(full_path):
            sub_res = generate_tree(full_path, prefix + ("    " if is_last else "│   "), ignore_dirs)
            result.extend(sub_res)
    return result

if __name__ == "__main__":
    lines = generate_tree(".")
    with open("tree_output.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
