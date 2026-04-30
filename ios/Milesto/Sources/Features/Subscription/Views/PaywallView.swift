import SwiftUI

struct PaywallView: View {
    @State private var model = PaywallViewModel(subscription: SyncingSubscriptionRepository.shared)
    @State private var heroVisible = false
    @State private var featuresVisible = false
    @State private var plansVisible = false
    @State private var ctaVisible = false
    @State private var glowScale: CGFloat = 0.9
    @State private var glowOpacity: Double = 0.55
    @State private var sparklePulse: Double = 0.7
    @State private var showError = false

    var body: some View {
        ZStack {
            Color("BackgroundBase").ignoresSafeArea()

            PaywallAmbientGlow(scale: glowScale, opacity: glowOpacity)
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
            await model.loadPlans()
            startEntryAnimation()
            startAmbientAnimation()
        }
        .onChange(of: model.purchaseError) { _, newValue in
            showError = newValue != nil
        }
        .alert(
            String(localized: "paywall.error.title", table: "Paywall"),
            isPresented: $showError,
            presenting: model.purchaseError
        ) { _ in
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                model.purchaseError = nil
            }
        } message: { message in
            Text(message)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 8) {
                TablerIcons(.sparkles2, size: 16, color: Color("Brand"))
                    .opacity(sparklePulse)

                AppText("paywall.premium.tag", table: "Paywall", style: .caption)
                    .color(Color("Brand"))
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

    private var featureList: some View {
        VStack(spacing: 14) {
            PaywallFeatureRow(icon: .compass, labelKey: "paywall.feature.roadmap")
            PaywallFeatureRow(icon: .brain, labelKey: "paywall.feature.chat")
            PaywallFeatureRow(icon: .trophy, labelKey: "paywall.feature.stats")
            PaywallFeatureRow(icon: .sparkles, labelKey: "paywall.feature.adaptive")
        }
    }

    private var planSelector: some View {
        HStack(spacing: 12) {
            PaywallPlanCard(
                titleKey: "paywall.plan.annual.title",
                price: model.annualPlan?.displayPrice ?? "—",
                periodKey: "paywall.plan.annual.period",
                footnoteKey: "paywall.plan.annual.trial",
                badgeKey: "paywall.plan.save",
                isSelected: model.isAnnualSelected,
                onSelect: { model.selectAnnual() }
            )

            PaywallPlanCard(
                titleKey: "paywall.plan.monthly.title",
                price: model.monthlyPlan?.displayPrice ?? "—",
                periodKey: "paywall.plan.monthly.period",
                footnoteKey: nil,
                badgeKey: nil,
                isSelected: !model.isAnnualSelected && model.selectedPlan != nil,
                onSelect: { model.selectMonthly() }
            )
        }
    }

    private var ctaStack: some View {
        VStack(spacing: 14) {
            PaywallCTAButton(
                titleKey: model.isAnnualSelected ? "paywall.cta.trial" : "paywall.cta.subscribe",
                isLoading: model.isPurchasing,
                isDisabled: model.selectedPlan == nil,
                action: {
                    Task {
                        await model.purchaseSelected()
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
                    Task { await model.restore() }
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
        if model.isAnnualSelected {
            guard let price = model.annualPlan?.displayPrice else { return "" }
            return String(format: String(localized: "paywall.terms.trial.annual", table: "Paywall"), price)
        } else {
            guard let price = model.monthlyPlan?.displayPrice else { return "" }
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

#Preview {
    PaywallView()
}
