import SwiftUI

struct DSIconGrid: View {
    @State private var query: String = ""
    @State private var showFilled: Bool = false

    private let columns: [GridItem] = Array(repeating: GridItem(.flexible(), spacing: 12), count: 4)
    private let renderCap: Int = 240

    private var outlineMatches: [TablerIconOutline] {
        let needle = query.lowercased()
        let all = TablerIconOutline.allCases
        return needle.isEmpty
            ? Array(all.prefix(renderCap))
            : all.filter { $0.iconName.contains(needle) }.prefix(renderCap).map { $0 }
    }

    private var filledMatches: [TablerIconFilled] {
        let needle = query.lowercased()
        let all = TablerIconFilled.allCases
        return needle.isEmpty
            ? Array(all.prefix(renderCap))
            : all.filter { $0.iconName.contains(needle) }.prefix(renderCap).map { $0 }
    }

    private var totalCount: Int {
        showFilled ? TablerIconFilled.allCases.count : TablerIconOutline.allCases.count
    }

    private var matchCount: Int {
        showFilled ? filledMatches.count : outlineMatches.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            AppTextField(
                text: $query,
                placeholder: "search icons",
                icon: .search,
                autocorrectionDisabled: true
            )

            HStack(spacing: 8) {
                AppPill(
                    verbatim: showFilled ? "filled" : "outline",
                    tint: Color("Brand"),
                    icon: showFilled ? .circle : .circleDashed
                )
                .onTapGesture { showFilled.toggle() }

                Spacer()

                AppText(
                    verbatim: query.isEmpty ? "\(totalCount) icons" : "\(matchCount) of \(totalCount)",
                    style: .caption
                )
                .color(Color("TextSecondary"))
            }

            LazyVGrid(columns: columns, spacing: 16) {
                if showFilled {
                    ForEach(filledMatches, id: \.rawValue) { icon in
                        cell(name: icon.iconName) {
                            TablerIcons.filled(icon, size: 24, color: Color("TextPrimary"))
                        }
                    }
                } else {
                    ForEach(outlineMatches, id: \.rawValue) { icon in
                        cell(name: icon.iconName) {
                            TablerIcons(icon, size: 24, color: Color("TextPrimary"))
                        }
                    }
                }
            }

            if matchCount == renderCap {
                AppText(verbatim: "Showing first \(renderCap) results — refine your search to narrow down.", style: .caption)
                    .color(Color("TextSecondary"))
            }
        }
    }

    private func cell<Icon: View>(name: String, @ViewBuilder icon: () -> Icon) -> some View {
        VStack(spacing: 6) {
            icon()
                .frame(height: 28)
            AppText(verbatim: name, style: .caption)
                .color(Color("TextSecondary"))
                .alignment(.center)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color("BackgroundBase"))
        )
    }
}
