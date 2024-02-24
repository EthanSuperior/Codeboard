import re

def extract_code(file_path, result_path):
    with open(file_path, 'r') as file:
        content = file.read()

    # Use regular expression to find .js references and their content
    pattern = r"(// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+\n// (.+\.js)\n// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+\n([\s\S]*?)(?=\n// ~|$))"
    matches = re.finditer(pattern, content)

    with open(result_path, 'w') as result:
        position = 0  # Keep track of the position in the file
        for match in matches:
            start, end = match.span()
            file_name = match.group(2)
            file_content = match.group(3).strip()

            # Include the original content between the previous match and the current match
            result.write(content[position:start])

            # Print or process the extracted information as needed
            result.write(f"// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n// {file_name}\n// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
            with open(file_name, 'r') as referenced_file:
                referenced_content = referenced_file.read()
                result.write(referenced_content)
                print(file_name)
            result.write("\n")

            position = end

        # Include the remaining original content after the last match
        result.write(content[position:])

# Example usage
file_path = "TemplateCodeboardEngine.js"
result_path = "CodeboardEngine.js"
extract_code(file_path, result_path)
