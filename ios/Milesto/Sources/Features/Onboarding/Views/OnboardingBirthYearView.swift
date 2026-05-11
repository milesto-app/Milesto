import SwiftUI

struct OnboardingBirthYearView: View {
    @Binding var birthYear: Int?
    let onContinue: () -> Void
    let onSkip: () -> Void

    private static let minAgeYears = 13
    private static let maxAgeYears = 100
    private static let defaultAgeYears = 20

    private var currentYear: Int {
        Calendar.current.component(.year, from: Date())
    }

    private var yearRange: [Int] {
        let oldest = currentYear - Self.maxAgeYears
        let youngest = currentYear - Self.minAgeYears
        return Array((oldest ... youngest).reversed())
    }

    private var selectedYearBinding: Binding<Int> {
        Binding(
            get: { birthYear ?? (currentYear - Self.defaultAgeYears) },
            set: { birthYear = $0 }
        )
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.birthYear.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.birthYear.subtitle", table: "Onboarding", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            Picker(
                String(localized: "onboarding.birthYear.title", table: "Onboarding"),
                selection: selectedYearBinding
            ) {
                ForEach(yearRange, id: \.self) { year in
                    AppText(verbatim: String(year), style: .title)
                        .tag(year)
                }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
            .onChange(of: selectedYearBinding.wrappedValue) {
                Haptics.selection()
            }

            Spacer()

            VStack(spacing: 16) {
                AppButton("common.continue", table: "Common") {
                    if birthYear == nil {
                        birthYear = currentYear - Self.defaultAgeYears
                    }
                    onContinue()
                }
                .fullWidth()

                AppButton("onboarding.birthYear.skip", table: "Onboarding", action: onSkip)
                    .fullWidth()

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .appBackground()
    }
}
