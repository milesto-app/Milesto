import StoreKit
import SwiftUI

struct PaywallView: View {
    @StateObject private var subscription = SubscriptionService.shared
    @State private var selectedProductId: String = SubscriptionService.quarterlyProductId
    @State private var heroVisible = false
    @State private var featuresVisible = false
    @State private var plansVisible = false
    @State private var ctaVisible = false
    @State private var glowScale: CGFloat = 0.9
    @State private var glowOpacity: Double = 0.55
    @State private var sparklePulse: Double = 0.7
    @State private var showError = false

    private var selectedProduct: Product? {
        subscription.products.first { $0.id == selectedProductId }
    }

    private var isQuarterlySelected: Bool {
        selectedProductId == SubscriptionService.quarterlyProductId
    }

    var body: some View {
        ZStack {
            Color("BgPrimary").ignoresSafeArea()

            AmbientGlow(scale: glowScale, opacity: glowOpacity)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 40) {
                        hero
                            .opacity(heroVisible ? 1 : 0)
                            .offset(y: heroVisible ? 0 : 24)

                        featureList
                            .opacity(featuresVisible ? 1 : 0)
                            .offset(y: featuresVisible ? 0 : 24)

                        planSelector
                            .opacity(plansVisible ? 1 : 0)
                            .offset(y: plansVisible ? 0 : 24)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                    .padding(.bottom, 24)
                }
                .scrollBounceBehavior(.basedOnSize)

                ctaStack
                    .opacity(ctaVisible ? 1 : 0)
                    .offset(y: ctaVisible ? 0 : 24)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 8)
            }
        }
        .interactiveDismissDisabled(true)
        .task {
            await subscription.loadProducts()
            startEntryAnimation()
            startAmbientAnimation()
        }
        .onChange(of: subscription.purchaseError) { _, newValue in
            showError = newValue != nil
        }
        .alert(
            String(localized: "paywall.error.title", table: "Paywall"),
            isPresented: $showError,
            presenting: subscription.purchaseError
        ) { _ in
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                subscription.purchaseError = nil
            }
        } message: { message in
            Text(message)
        }
    }

    // MARK: - Hero

    private var hero: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 8) {
                TablerIcons(.sparkles2, size: 16, color: Color("TintPrimary"))
                    .opacity(sparklePulse)

                AppText("paywall.premium.tag", table: "Paywall", style: .caption)
                    .color(Color("TintPrimary"))
                    .weight(.semibold)
            }

            AppText("paywall.headline", table: "Paywall", style: .largeTitle)
                .weight(.semibold)
                .alignment(.leading)

            AppText("paywall.subheadline", table: "Paywall", style: .body)
                .color(Color("TextSecondary"))
                .alignment(.leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Features

    private var featureList: some View {
        VStack(spacing: 14) {
            PaywallFeatureRow(icon: .compass, labelKey: "paywall.feature.roadmap")
            PaywallFeatureRow(icon: .brain, labelKey: "paywall.feature.chat")
            PaywallFeatureRow(icon: .microphone, labelKey: "paywall.feature.voice")
            PaywallFeatureRow(icon: .trophy, labelKey: "paywall.feature.stats")
        }
    }

    // MARK: - Plans

    private var planSelector: some View {
        HStack(spacing: 12) {
            PlanCard(
                titleKey: "paywall.plan.quarterly.title",
                price: subscription.quarterlyProduct?.displayPrice ?? "$44.99",
                periodKey: "paywall.plan.quarterly.period",
                footnoteKey: "paywall.plan.quarterly.trial",
                badgeKey: "paywall.plan.save",
                isSelected: selectedProductId == SubscriptionService.quarterlyProductId,
                onSelect: { selectedProductId = SubscriptionService.quarterlyProductId }
            )

            PlanCard(
                titleKey: "paywall.plan.monthly.title",
                price: subscription.monthlyProduct?.displayPrice ?? "$19.99",
                periodKey: "paywall.plan.monthly.period",
                footnoteKey: nil,
                badgeKey: nil,
                isSelected: selectedProductId == SubscriptionService.monthlyProductId,
                onSelect: { selectedProductId = SubscriptionService.monthlyProductId }
            )
        }
    }

    // MARK: - CTA

    private var ctaStack: some View {
        VStack(spacing: 14) {
            PaywallCTAButton(
                titleKey: isQuarterlySelected ? "paywall.cta.trial" : "paywall.cta.subscribe",
                isLoading: subscription.isPurchasing,
                action: {
                    Task {
                        guard let product = selectedProduct else { return }
                        await subscription.purchase(product)
                    }
                }
            )

            AppText(
                verbatim: termsLine,
                style: .caption
            )
            .color(Color("TextSecondary"))
            .alignment(.center)

            HStack(spacing: 20) {
                footerLink("paywall.footer.restore") {
                    Task { await subscription.restore() }
                }
                Circle()
                    .fill(Color("TextSecondary").opacity(0.3))
                    .frame(width: 3, height: 3)
                footerLink("paywall.footer.terms") {}
                Circle()
                    .fill(Color("TextSecondary").opacity(0.3))
                    .frame(width: 3, height: 3)
                footerLink("paywall.footer.privacy") {}
            }
            .padding(.top, 4)
        }
    }

    private var termsLine: String {
        if isQuarterlySelected {
            let price = subscription.quarterlyProduct?.displayPrice ?? "$44.99"
            return String(format: String(localized: "paywall.terms.trial.quarterly", table: "Paywall"), price)
        } else {
            let price = subscription.monthlyProduct?.displayPrice ?? "$19.99"
            return String(format: String(localized: "paywall.terms.monthly", table: "Paywall"), price)
        }
    }

    private func footerLink(_ key: LocalizedStringKey, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(key, tableName: "Paywall")
                .font(Fonts.ui(size: 12, relativeTo: .caption, weight: .medium))
                .foregroundStyle(Color("TextSecondary"))
        }
    }

    // MARK: - Animation

    private func startEntryAnimation() {
        withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.1)) {
            heroVisible = true
        }
        withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.3)) {
            featuresVisible = true
        }
        withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.5)) {
            plansVisible = true
        }
        withAnimation(.spring(response: 0.7, dampingFraction: 0.85).delay(0.7)) {
            ctaVisible = true
        }
    }

    private func startAmbientAnimation() {
        withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
            glowScale = 1.25
            glowOpacity = 0.8
        }
        withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
            sparklePulse = 1.0
        }
    }
}

// MARK: - Ambient Glow

private struct AmbientGlow: View {
    let scale: CGFloat
    let opacity: Double

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color("TintPrimary").opacity(0.35),
                                Color("TintPrimary").opacity(0.1),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.7
                        )
                    )
                    .frame(width: geo.size.width * 1.4, height: geo.size.width * 1.4)
                    .offset(x: -geo.size.width * 0.35, y: -geo.size.height * 0.22)
                    .scaleEffect(scale)
                    .opacity(opacity)
                    .blur(radius: 40)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color("TintPrimary").opacity(0.18),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.5
                        )
                    )
                    .frame(width: geo.size.width, height: geo.size.width)
                    .offset(x: geo.size.width * 0.3, y: geo.size.height * 0.18)
                    .blur(radius: 60)
            }
        }
    }
}

// MARK: - Feature Row

private struct PaywallFeatureRow: View {
    let icon: TablerIconOutline
    let labelKey: LocalizedStringKey

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color("TintPrimary").opacity(0.12))
                    .frame(width: 36, height: 36)
                TablerIcons(icon, size: 18, color: Color("TintPrimary"))
            }

            AppText(labelKey, table: "Paywall", style: .body)
                .weight(.medium)

            Spacer(minLength: 0)

            TablerIcons(.check, size: 18, color: Color("TintPrimary"))
                .opacity(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Plan Card

private struct PlanCard: View {
    let titleKey: LocalizedStringKey
    let price: String
    let periodKey: LocalizedStringKey
    let footnoteKey: LocalizedStringKey?
    let badgeKey: LocalizedStringKey?
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 8) {
                AppText(titleKey, table: "Paywall", style: .subheadline)
                    .weight(.semibold)
                    .color(Color("TextSecondary"))

                AppText(verbatim: price, style: .title)
                    .weight(.semibold)

                AppText(periodKey, table: "Paywall", style: .caption)
                    .color(Color("TextSecondary"))

                if let footnoteKey {
                    Spacer(minLength: 4)
                    HStack(spacing: 6) {
                        TablerIcons(.gift, size: 12, color: Color("TintPrimary"))
                        AppText(footnoteKey, table: "Paywall", style: .caption)
                            .color(Color("TintPrimary"))
                            .weight(.semibold)
                    }
                } else {
                    Spacer(minLength: 4)
                    Color.clear.frame(height: 14)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 160, alignment: .topLeading)
            .contentShape(Rectangle())
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color("TintPrimary"), lineWidth: 2)
                    .opacity(isSelected ? 1 : 0)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 1)
                    .opacity(isSelected ? 0 : 1)
            )
            .overlay(alignment: .topTrailing) {
                if let badgeKey {
                    Text(badgeKey, tableName: "Paywall")
                        .font(Fonts.ui(size: 10, relativeTo: .caption, weight: .bold))
                        .tracking(0.8)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                        .foregroundStyle(Color("TextOnAccent"))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule().fill(Color("TintPrimary"))
                        )
                        .offset(x: 8, y: -10)
                }
            }
            .scaleEffect(isSelected ? 1.0 : 0.98)
            .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isSelected)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - CTA Button

private struct PaywallCTAButton: View {
    let titleKey: LocalizedStringKey
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView()
                        .tint(Color("TextOnAccent"))
                } else {
                    Text(titleKey, tableName: "Paywall")
                        .font(Fonts.ui(size: 17, relativeTo: .headline, weight: .semibold))

                    TablerIcons(.arrowRight, size: 18, color: Color("TextOnAccent"))
                }
            }
            .foregroundStyle(Color("TextOnAccent"))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color("TintPrimary"))
            )
            .shadow(color: Color("TintPrimary").opacity(0.28), radius: 18, x: 0, y: 8)
        }
        .buttonStyle(PaywallPressStyle())
        .disabled(isLoading)
    }
}

private struct PaywallPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.12), value: configuration.isPressed)
    }
}

#Preview {
    PaywallView()
}
