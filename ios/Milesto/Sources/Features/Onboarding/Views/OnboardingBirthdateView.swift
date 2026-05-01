import SwiftUI

struct OnboardingBirthdateView: View {
    @Binding var dateOfBirth: Date
    let onContinue: () -> Void

    private var dateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let now = Date()
        let minDate = calendar.date(byAdding: .year, value: -120, to: now) ?? now
        let maxDate = calendar.date(byAdding: .year, value: -13, to: now) ?? now
        return minDate ... maxDate
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.birthdate.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.birthdate.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            DatePicker(
                "",
                selection: $dateOfBirth,
                in: dateRange,
                displayedComponents: .date
            )
            .datePickerStyle(.wheel)
            .labelsHidden()

            Spacer()

            VStack(spacing: 16) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
    }
}
