import SwiftUI

struct PaywallView: View {
    @Environment(AppDependencies.self) private var dependencies
    @State private var model: PaywallViewModel?
    @State private var heroVisible = false
    @State private var featuresVisible = false
    @State private var plansVisible = false
    @State private var ctaVisible = false
    @State private var glowScale: CGFloat = 0.9
    @State private var glowOpacity: Double = 0.55
    @State private var showError = false

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = PaywallViewModel(subscription: dependencies.subscription)
            }
            await model?.loadPlans()
            startEntryAnimation()
            startAmbientAnimation()
        }
    }

    private func content(model: PaywallViewModel) -> some View {
        ZStack {
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

                        planSelector(model: model)
                            .opacity(plansVisible ? 1 : 0)
                            .offset(y: plansVisible ? 0 : 24)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                    .padding(.bottom, 24)
                }
                .scrollBounceBehavior(.basedOnSize)

                ctaStack(model: model)
                    .opacity(ctaVisible ? 1 : 0)
                    .offset(y: ctaVisible ? 0 : 24)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 8)
            }
        }
        .appBackground()
        .interactiveDismissDisabled(true)
        .onChange(of: model.purchaseErrorMessage) { _, newValue in
            showError = newValue != nil
        }
        .alert(
            String(localized: "paywall.error.title", table: "Paywall"),
            isPresented: $showError,
            presenting: model.purchaseErrorMessage
        ) { _ in
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                model.dismissPurchaseError()
            }
        } message: { message in
            AppText(verbatim: message, style: .body)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 20) {
            AppPill("paywall.premium.tag", table: "Paywall", tint: Color("Brand"), icon: .sparkles2)

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

    private func planSelector(model: PaywallViewModel) -> some View {
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

    private func ctaStack(model: PaywallViewModel) -> some View {
        VStack(spacing: 14) {
            PaywallCTAButton(
                titleKey: model.isAnnualSelected ? "paywall.cta.trial" : "paywall.cta.subscribe",
                isLoading: model.isPurchasing,
                isDisabled: model.selectedPlan == nil,
                action: {
                    Task { await model.purchaseSelected() }
                }
            )

            AppText(
                verbatim: termsLine(model: model),
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

    private func termsLine(model: PaywallViewModel) -> String {
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
            AppText(key, table: "Paywall", style: .caption)
                .color(Color("TextSecondary"))
                .weight(.medium)
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
    }
}
