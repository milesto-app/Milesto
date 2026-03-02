import SwiftUI

struct OnboardingBirthdateView: View {
    @Binding var dateOfBirth: Date
    let onContinue: () -> Void

    private var dateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let now = Date()
        let minDate = calendar.date(byAdding: .year, value: -120, to: now)!
        let maxDate = calendar.date(byAdding: .year, value: -13, to: now)!
        return minDate...maxDate
    }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("onboarding.birthdate.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.birthdate.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.lg)

            DatePicker(
                "",
                selection: $dateOfBirth,
                in: dateRange,
                displayedComponents: .date
            )
            .datePickerStyle(.wheel)
            .labelsHidden()

            Spacer()

            VStack(spacing: AppTheme.Spacing.md) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.bottom, AppTheme.Spacing.lg)
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingBirthdateView(
            dateOfBirth: .constant(Date()),
            onContinue: { }
        )
    }
}
