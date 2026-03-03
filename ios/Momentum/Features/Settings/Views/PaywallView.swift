import SwiftUI
import StoreKit

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var storeService: StoreService
    @State private var selectedPlan: Plan = .yearly
    @State private var isPurchasing = false
    @State private var errorMessage: String?
    @State private var showError = false

    enum Plan: String, CaseIterable {
        case yearly
        case monthly

        var productID: String {
            switch self {
            case .yearly: return "6759965333"
            case .monthly: return "6759965329"
            }
        }
    }

    private func product(for plan: Plan) -> Product? {
        storeService.products.first { $0.id == plan.productID }
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            ScrollView {
                VStack(spacing: 32) {
                    headerSection
                    planSelector
                    featuresSection
                    ctaSection
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 40)
            }

            Button {
                dismiss()
            } label: {
                TablerIcon(.x, size: 20, color: AppTheme.Colors.textSecondary)
                    .frame(width: 36, height: 36)
                    .background(AppTheme.Colors.fieldBackground)
                    .clipShape(Circle())
            }
            .padding(.top, 16)
            .padding(.trailing, 24)
        }
        .task {
            await storeService.loadProducts()
        }
        .alert(String(localized: "paywall.error.title", table: "Paywall"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(verbatim: errorMessage ?? "")
        }
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(AppTheme.Colors.accent.opacity(0.12))
                    .frame(width: 88, height: 88)

                TablerIcon(.crown, size: 40, color: AppTheme.Colors.accent)
            }

            VStack(spacing: 8) {
                AppText("paywall.title", table: "Paywall", style: .largeTitle)
                    .alignment(.center)

                AppText("paywall.subtitle", table: "Paywall", style: .subheadline)
                    .alignment(.center)
            }
        }
    }

    private var planSelector: some View {
        HStack(spacing: 12) {
            planCard(
                plan: .yearly,
                price: product(for: .yearly)?.displayPrice ?? String(localized: "paywall.plan.yearly.price", table: "Paywall"),
                period: String(localized: "paywall.plan.yearly.period", table: "Paywall"),
                badge: String(localized: "paywall.plan.yearly.badge", table: "Paywall")
            )

            planCard(
                plan: .monthly,
                price: product(for: .monthly)?.displayPrice ?? String(localized: "paywall.plan.monthly.price", table: "Paywall"),
                period: String(localized: "paywall.plan.monthly.period", table: "Paywall"),
                badge: nil
            )
        }
    }

    private func planCard(plan: Plan, price: String, period: String, badge: String?) -> some View {
        let isSelected = selectedPlan == plan

        return Button {
            withAnimation(.spring(duration: 0.25)) {
                selectedPlan = plan
            }
        } label: {
            VStack(spacing: 8) {
                if let badge {
                    AppText(verbatim: badge, style: .caption)
                        .color(AppTheme.Colors.textOnAccent)
                        .weight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.Colors.accent)
                        .clipShape(Capsule())
                } else {
                    Spacer()
                        .frame(height: 22)
                }

                AppText(verbatim: price, style: .title)
                    .color(isSelected ? AppTheme.Colors.textPrimary : AppTheme.Colors.textSecondary)

                AppText(verbatim: period, style: .caption)
                    .color(AppTheme.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .padding(.horizontal, 12)
            .background(AppTheme.Colors.fieldBackground)
            .cornerRadius(AppTheme.CornerRadius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg)
                    .stroke(isSelected ? AppTheme.Colors.accent : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var featuresSection: some View {
        VStack(spacing: 0) {
            featureRow(icon: .brain, key: "paywall.feature.coach")
            featureRow(icon: .listCheck, key: "paywall.feature.roadmap")
            featureRow(icon: .messageChatbot, key: "paywall.feature.chat")
            featureRow(icon: .chartLine, key: "paywall.feature.stats")
            featureRow(icon: .refresh, key: "paywall.feature.replan")
        }
        .padding(16)
        .background(AppTheme.Colors.fieldBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
    }

    private func featureRow(icon: TablerIconOutline, key: LocalizedStringKey) -> some View {
        HStack(spacing: 12) {
            TablerIcon(icon, size: 22, color: AppTheme.Colors.accent)
                .frame(width: 28)

            AppText(key, table: "Paywall", style: .body)

            Spacer()

            TablerIcon(.circleCheck, size: 20, color: AppTheme.Colors.accent)
        }
        .padding(.vertical, 12)
    }

    private var ctaSection: some View {
        VStack(spacing: 16) {
            AppButton("paywall.cta", table: "Paywall") {
                Task {
                    guard let selectedProduct = product(for: selectedPlan) else { return }
                    isPurchasing = true
                    defer { isPurchasing = false }

                    do {
                        try await storeService.purchase(selectedProduct)
                        if storeService.isPro {
                            dismiss()
                        }
                    } catch {
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            }
            .fullWidth()
            .disabled(isPurchasing || product(for: selectedPlan) == nil)

            if isPurchasing {
                ProgressView()
            }

            AppButton("paywall.restore", table: "Paywall", style: .text) {
                Task {
                    await storeService.restorePurchases()
                    if storeService.isPro {
                        dismiss()
                    }
                }
            }
            .disabled(isPurchasing)

            AppText("paywall.terms", table: "Paywall", style: .caption)
                .alignment(.center)
        }
    }
}

#Preview {
    PaywallView()
        .environmentObject(StoreService.shared)
}
