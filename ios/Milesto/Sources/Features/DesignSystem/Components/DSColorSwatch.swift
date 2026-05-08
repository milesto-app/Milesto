import SwiftUI

struct DSColorToken: Identifiable {
    let id: String
    let name: String
    let lightHex: String
    let darkHex: String?

    init(name: String, lightHex: String, darkHex: String?) {
        id = name
        self.name = name
        self.lightHex = lightHex
        self.darkHex = darkHex
    }
}

struct DSColorSwatch: View {
    let token: DSColorToken

    var body: some View {
        HStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(token.name))
                .frame(width: 56, height: 56)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color("TextSecondary").opacity(0.18), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 2) {
                AppText(verbatim: token.name, style: .body)
                    .weight(.semibold)

                HStack(spacing: 8) {
                    AppText(verbatim: "L \(token.lightHex)", style: .caption)
                        .color(Color("TextSecondary"))
                    if let darkHex = token.darkHex {
                        AppText(verbatim: "D \(darkHex)", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                }
            }

            Spacer(minLength: 0)
        }
    }
}
