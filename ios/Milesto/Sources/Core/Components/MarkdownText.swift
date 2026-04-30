import SwiftUI

enum MarkdownBlock {
    case paragraph(String)
    case codeBlock(String, language: String?)
    case heading(String, level: Int)
    case unorderedList([String])
    case orderedList([String])
}

struct MarkdownText: View {
    let content: String
    var textColor: Color = .init("TextPrimary")
    var codeBackground: Color = .init("BackgroundElevated")

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(parse(content).enumerated()), id: \.offset) { _, block in
                renderBlock(block)
            }
        }
    }

    @ViewBuilder
    private func renderBlock(_ block: MarkdownBlock) -> some View {
        switch block {
        case let .paragraph(text):
            inlineMarkdown(text)

        case let .codeBlock(code, _):
            Text(verbatim: code)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(textColor)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(codeBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))

        case let .heading(text, level):
            inlineMarkdown(text)
                .font(level <= 2 ? Fonts.display(size: 20, relativeTo: .headline, weight: .bold) : Fonts.display(size: 15, relativeTo: .subheadline, weight: .medium))
                .bold()

        case let .unorderedList(items):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 0) {
                        Text(verbatim: "\u{2022}  ")
                            .foregroundStyle(textColor)
                        inlineMarkdown(item)
                    }
                }
            }

        case let .orderedList(items):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .top, spacing: 0) {
                        Text(verbatim: "\(index + 1).  ")
                            .foregroundStyle(textColor)
                        inlineMarkdown(item)
                    }
                }
            }
        }
    }

    private func inlineMarkdown(_ text: String) -> Text {
        do {
            var attributed = try AttributedString(
                markdown: text,
                options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
            )
            attributed.foregroundColor = textColor
            return Text(attributed)
        } catch {
            return Text(verbatim: text)
        }
    }

    private func parse(_ markdown: String) -> [MarkdownBlock] {
        let lines = markdown.components(separatedBy: "\n")
        var blocks: [MarkdownBlock] = []
        var index = 0

        while index < lines.count {
            let line = lines[index]

            if line.hasPrefix("```") {
                let language = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                var codeLines: [String] = []
                index += 1
                while index < lines.count, !lines[index].hasPrefix("```") {
                    codeLines.append(lines[index])
                    index += 1
                }
                blocks.append(.codeBlock(
                    codeLines.joined(separator: "\n"),
                    language: language.isEmpty ? nil : language
                ))
                index += 1
                continue
            }

            if let headingMatch = line.range(of: #"^(#{1,6})\s+"#, options: .regularExpression) {
                let hashes = line[headingMatch].filter { $0 == "#" }.count
                let text = String(line[headingMatch.upperBound...])
                blocks.append(.heading(text, level: hashes))
                index += 1
                continue
            }

            if line.range(of: #"^[-*]\s+"#, options: .regularExpression) != nil {
                var items: [String] = []
                while index < lines.count,
                      let match = lines[index].range(of: #"^[-*]\s+"#, options: .regularExpression)
                {
                    items.append(String(lines[index][match.upperBound...]))
                    index += 1
                }
                blocks.append(.unorderedList(items))
                continue
            }

            if line.range(of: #"^\d+\.\s+"#, options: .regularExpression) != nil {
                var items: [String] = []
                while index < lines.count,
                      let match = lines[index].range(of: #"^\d+\.\s+"#, options: .regularExpression)
                {
                    items.append(String(lines[index][match.upperBound...]))
                    index += 1
                }
                blocks.append(.orderedList(items))
                continue
            }

            if line.trimmingCharacters(in: .whitespaces).isEmpty {
                index += 1
                continue
            }

            var paragraphLines: [String] = []
            while index < lines.count {
                let current = lines[index]
                if current.trimmingCharacters(in: .whitespaces).isEmpty
                    || current.hasPrefix("```")
                    || current.range(of: #"^#{1,6}\s+"#, options: .regularExpression) != nil
                    || current.range(of: #"^[-*]\s+"#, options: .regularExpression) != nil
                    || current.range(of: #"^\d+\.\s+"#, options: .regularExpression) != nil
                {
                    break
                }
                paragraphLines.append(current)
                index += 1
            }
            if !paragraphLines.isEmpty {
                blocks.append(.paragraph(paragraphLines.joined(separator: " ")))
            }
        }

        return blocks
    }
}

#Preview {
    ScrollView {
        MarkdownText(content: """
        ## Getting Started

        Here's a **bold** and *italic* example with `inline code`.

        ### Steps to follow

        1. First step
        2. Second step
        3. Third step

        - Bullet point one
        - Bullet point two

        ```swift
        let x = 42
        print("Hello world")
        ```

        Visit [Apple](https://apple.com) for more info.
        """)
        .padding()
    }
}
