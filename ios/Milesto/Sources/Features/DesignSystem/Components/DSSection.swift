import SwiftUI

struct DSSection<Content: View>: View {
    let title: String
    let subtitle: String?
    @ViewBuilder let content: () -> Content

    init(_ title: String, subtitle: String? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                AppText(verbatim: title, style: .headline)
                    .weight(.semibold)
                if let subtitle {
                    AppText(verbatim: subtitle, style: .caption)
                        .color(Color("TextSecondary"))
                }
            }

            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color("BackgroundElevated"))
        )
    }
}
