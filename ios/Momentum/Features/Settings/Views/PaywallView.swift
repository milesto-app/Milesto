import SwiftUI

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPlan: Plan = .yearly

    enum Plan: String, CaseIterable {
        case yearly
        case monthly
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            ScrollView {
                VStack(spacing: AppTheme.Spacing.xl) {
                    headerSection
                    planSelector
                    featuresSection
                    ctaSection
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.top, 60)
                .padding(.bottom, AppTheme.Spacing.xxl)
            }

            Button {
                dismiss()
            } label: {
                TablerIcon(.x, size: 20, color: AppTheme.Colors.textSecondary)
                    .frame(width: 36, height: 36)
                    .background(AppTheme.Colors.fieldBackground)
                    .clipShape(Circle())
            }
            .padding(.top, AppTheme.Spacing.md)
            .padding(.trailing, AppTheme.Spacing.lg)
        }
    }

    private var headerSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            ZStack {
                Circle()
                    .fill(AppTheme.Colors.accent.opacity(0.12))
                    .frame(width: 88, height: 88)

                TablerIcon(.crown, size: 40, color: AppTheme.Colors.accent)
            }

            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("paywall.title", table: "Paywall", style: .largeTitle)
                    .alignment(.center)

                AppText("paywall.subtitle", table: "Paywall", style: .subheadline)
                    .alignment(.center)
            }
        }
    }

    private var planSelector: some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            planCard(
                plan: .yearly,
                price: String(localized: "paywall.plan.yearly.price", table: "Paywall"),
                period: String(localized: "paywall.plan.yearly.period", table: "Paywall"),
                badge: String(localized: "paywall.plan.yearly.badge", table: "Paywall")
            )

            planCard(
                plan: .monthly,
                price: String(localized: "paywall.plan.monthly.price", table: "Paywall"),
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
            VStack(spacing: AppTheme.Spacing.xs) {
                if let badge {
                    AppText(verbatim: badge, style: .caption)
                        .color(AppTheme.Colors.textOnAccent)
                        .weight(.semibold)
                        .padding(.horizontal, AppTheme.Spacing.xs)
                        .padding(.vertical, AppTheme.Spacing.xxs)
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
            .padding(.vertical, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.sm)
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
        .padding(AppTheme.Spacing.md)
        .background(AppTheme.Colors.fieldBackground)
        .cornerRadius(AppTheme.CornerRadius.lg)
    }

    private func featureRow(icon: TablerIconOutline, key: LocalizedStringKey) -> some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            TablerIcon(icon, size: 22, color: AppTheme.Colors.accent)
                .frame(width: 28)

            AppText(key, table: "Paywall", style: .body)

            Spacer()

            TablerIcon(.circleCheck, size: 20, color: AppTheme.Colors.accent)
        }
        .padding(.vertical, AppTheme.Spacing.sm)
    }

    private var ctaSection: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            AppButton("paywall.cta", table: "Paywall") {

            }
            .fullWidth()

            AppButton("paywall.restore", table: "Paywall", style: .text) {

            }

            AppText("paywall.terms", table: "Paywall", style: .caption)
                .alignment(.center)
        }
    }
}

#Preview {
    PaywallView()
}
