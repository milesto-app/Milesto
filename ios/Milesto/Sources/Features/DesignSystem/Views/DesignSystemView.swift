import SwiftUI

struct DesignSystemView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var preferredScheme: ColorScheme = .light
    @State private var lastTappedButton: String = "tap a button"
    @State private var pillTint: Color = .init("Brand")

    @State private var fieldEmpty: String = ""
    @State private var fieldFilled: String = "Maty"
    @State private var fieldWithIcon: String = ""
    @State private var fieldError: String = "not-an-email"
    @State private var fieldSecure: String = "hunter2"

    private let colorTokens: [DSColorToken] = [
        DSColorToken(name: "Brand", lightHex: "#008FA6", darkHex: "#00E0FF"),
        DSColorToken(name: "BrandDeep", lightHex: "#00525F", darkHex: "#002830"),
        DSColorToken(name: "TextPrimary", lightHex: "#2A2B2A", darkHex: "#F4F3F0"),
        DSColorToken(name: "TextSecondary", lightHex: "#6F716F", darkHex: "#9B9C9B"),
        DSColorToken(name: "TextOnBrand", lightHex: "#FFFFFF", darkHex: nil),
        DSColorToken(name: "BackgroundBase", lightHex: "#F7F7F7", darkHex: "#000000"),
        DSColorToken(name: "BackgroundElevated", lightHex: "#F0F0F0", darkHex: "#1A1A1A"),
        DSColorToken(name: "Error", lightHex: "#EF4444", darkHex: "#DC2626"),
        DSColorToken(name: "Success", lightHex: "#10B981", darkHex: "#059669"),
        DSColorToken(name: "Warning", lightHex: "#F59E0B", darkHex: "#D97706"),
    ]

    private let typeSamples: [(style: AppTextStyle, name: String, meta: String)] = [
        (.largeTitle, "largeTitle", "34 / medium / -1.5"),
        (.title, "title", "28 / medium / -1.0"),
        (.headline, "headline", "20 / medium / -0.5"),
        (.body, "body", "17 / regular"),
        (.subheadline, "subheadline", "15 / regular"),
        (.caption, "caption", "12 / regular"),
    ]

    private let spacingSteps: [CGFloat] = [8, 12, 16, 24, 32]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                topBar
                colorsSection
                typographySection
                buttonsSection
                pillsSection
                textFieldsSection
                iconsSection
                spacingSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 48)
        }
        .scrollDismissesKeyboard(.interactively)
        .appBackground()
        .preferredColorScheme(preferredScheme)
    }

    private var topBar: some View {
        HStack(alignment: .center) {
            Button {
                dismiss()
            } label: {
                TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
            }

            Spacer()

            VStack(spacing: 0) {
                AppText(verbatim: "Design System", style: .headline)
                    .weight(.semibold)
                AppText(verbatim: "Milesto iOS", style: .caption)
                    .color(Color("TextSecondary"))
            }

            Spacer()

            Button {
                preferredScheme = preferredScheme == .light ? .dark : .light
            } label: {
                TablerIcons(
                    preferredScheme == .light ? .moon : .sun,
                    size: 24,
                    color: Color("TextPrimary")
                )
                .frame(width: 44, height: 44)
            }
        }
        .padding(.top, 8)
    }

    private var colorsSection: some View {
        DSSection("Colors", subtitle: "Color(\"Token\") from Assets.xcassets") {
            VStack(spacing: 12) {
                ForEach(colorTokens) { token in
                    DSColorSwatch(token: token)
                }
            }
        }
    }

    private var typographySection: some View {
        DSSection("Typography", subtitle: "AppTextStyle on the Geist family") {
            VStack(alignment: .leading, spacing: 18) {
                ForEach(typeSamples, id: \.name) { sample in
                    VStack(alignment: .leading, spacing: 4) {
                        AppText(verbatim: "The quick brown fox", style: sample.style)
                        AppText(verbatim: "\(sample.name) · \(sample.meta)", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                }

                Divider().background(Color("TextSecondary").opacity(0.2))

                VStack(alignment: .leading, spacing: 4) {
                    AppText(verbatim: "Body, weight: .bold override", style: .body)
                        .weight(.bold)
                    AppText(verbatim: "AppText(...).weight(.bold)", style: .caption)
                        .color(Color("TextSecondary"))
                }
            }
        }
    }

    private var buttonsSection: some View {
        DSSection("Buttons", subtitle: "AppButton — primary / neutral / secondary / text") {
            VStack(alignment: .leading, spacing: 16) {
                AppPill(verbatim: "Last tapped: \(lastTappedButton)", tint: Color("Brand"))

                buttonRow(label: ".primary") {
                    AppButton("Save", style: .primary) { lastTappedButton = "primary" }
                    AppButton("Continue", style: .primary) { lastTappedButton = "primary +icon" }
                        .icon(.arrowRight, position: .trailing)
                }

                buttonRow(label: ".neutral") {
                    AppButton("Cancel", style: .neutral) { lastTappedButton = "neutral" }
                    AppButton("Back", style: .neutral) { lastTappedButton = "neutral +icon" }
                        .icon(.chevronLeft, position: .leading)
                }

                buttonRow(label: ".secondary") {
                    AppButton("Learn more", style: .secondary) { lastTappedButton = "secondary" }
                    AppButton("Edit", style: .secondary) { lastTappedButton = "secondary +icon" }
                        .icon(.settings, position: .leading)
                }

                buttonRow(label: ".text") {
                    AppButton("Skip", style: .text) { lastTappedButton = "text" }
                    AppButton("Go", style: .text) { lastTappedButton = "text +icon" }
                        .icon(.arrowRight, position: .trailing)
                }

                Divider().background(Color("TextSecondary").opacity(0.2))

                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: ".fullWidth()", style: .caption)
                        .color(Color("TextSecondary"))
                    AppButton("Continue", style: .primary) { lastTappedButton = "primary fullWidth" }
                        .icon(.arrowRight, position: .trailing)
                        .fullWidth()
                }

                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: ".disabled(true)", style: .caption)
                        .color(Color("TextSecondary"))
                    AppButton("Submit", style: .primary) { lastTappedButton = "should not fire" }
                        .disabled(true)
                }
            }
        }
    }

    private func buttonRow<Buttons: View>(label: String, @ViewBuilder buttons: () -> Buttons) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            AppText(verbatim: label, style: .caption)
                .color(Color("TextSecondary"))
            HStack(spacing: 12) {
                buttons()
                Spacer(minLength: 0)
            }
        }
    }

    private var pillsSection: some View {
        DSSection("Pills", subtitle: "AppPill capsule badges") {
            VStack(alignment: .leading, spacing: 16) {
                FlowRow(spacing: 8) {
                    AppPill(verbatim: "Brand", tint: Color("Brand"))
                    AppPill(verbatim: "Error", tint: Color("Error"))
                    AppPill(verbatim: "Success", tint: Color("Success"))
                    AppPill(verbatim: "Warning", tint: Color("Warning"))
                }

                FlowRow(spacing: 8) {
                    AppPill(verbatim: "with icon", tint: Color("Brand"), icon: .check)
                    AppPill(verbatim: "alert", tint: Color("Error"), icon: .alertTriangle)
                    AppPill(verbatim: "done", tint: Color("Success"), icon: .check)
                }

                Divider().background(Color("TextSecondary").opacity(0.2))

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        AppText(verbatim: "Custom tint", style: .caption)
                            .color(Color("TextSecondary"))
                        Spacer()
                        ColorPicker("", selection: $pillTint, supportsOpacity: false)
                            .labelsHidden()
                    }
                    AppPill(verbatim: "your tint", tint: pillTint, icon: .palette)
                }
            }
        }
    }

    private var textFieldsSection: some View {
        DSSection("Text fields", subtitle: "AppTextField — type into them") {
            VStack(alignment: .leading, spacing: 16) {
                AppTextField(text: $fieldEmpty, label: "Email", placeholder: "you@milesto.app")
                AppTextField(text: $fieldFilled, label: "First name")
                AppTextField(text: $fieldWithIcon, label: "Search", icon: .search)
                AppTextField(
                    text: $fieldError,
                    label: "Email",
                    icon: .mail,
                    errorMessage: "Doesn't look like an email"
                )
                AppTextField(text: $fieldSecure, label: "Password", icon: .lock, isSecure: true)
            }
        }
    }

    private var iconsSection: some View {
        DSSection("Icons", subtitle: "TablerIcons — outline & filled") {
            DSIconGrid()
        }
    }

    private var spacingSection: some View {
        DSSection("Spacing & radii", subtitle: "Standard pt values used across the app") {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(spacingSteps, id: \.self) { step in
                        HStack(spacing: 12) {
                            AppText(verbatim: "\(Int(step))", style: .caption)
                                .color(Color("TextSecondary"))
                                .frame(width: 24, alignment: .trailing)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color("Brand"))
                                .frame(width: step, height: 16)
                            Spacer()
                        }
                    }
                }

                Divider().background(Color("TextSecondary").opacity(0.2))

                HStack(spacing: 16) {
                    VStack(spacing: 6) {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color("Brand"))
                            .frame(width: 80, height: 56)
                        AppText(verbatim: "radius 12", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                    VStack(spacing: 6) {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color("Brand"))
                            .frame(width: 80, height: 56)
                        AppText(verbatim: "radius 16", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                    VStack(spacing: 6) {
                        Capsule()
                            .fill(Color("Brand"))
                            .frame(width: 80, height: 32)
                        AppText(verbatim: "Capsule()", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                    Spacer()
                }
            }
        }
    }
}

private struct FlowRow<Content: View>: View {
    let spacing: CGFloat
    @ViewBuilder let content: () -> Content

    init(spacing: CGFloat = 8, @ViewBuilder content: @escaping () -> Content) {
        self.spacing = spacing
        self.content = content
    }

    var body: some View {
        HStack(spacing: spacing) {
            content()
            Spacer(minLength: 0)
        }
    }
}
