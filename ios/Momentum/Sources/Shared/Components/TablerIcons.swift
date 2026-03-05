import SwiftUI

struct TablerIcons: View {
    private let unicode: String
    var size: CGFloat = 24
    var color: Color?

    init(_ icon: TablerIconOutline, size: CGFloat = 24, color: Color? = nil) {
        unicode = icon.rawValue
        self.size = size
        self.color = color
    }

    static func filled(_ icon: TablerIconFilled, size: CGFloat = 24, color: Color? = nil) -> TablerIcons {
        TablerIcons(unicode: icon.rawValue, size: size, color: color)
    }

    private init(unicode: String, size: CGFloat, color: Color?) {
        self.unicode = unicode
        self.size = size
        self.color = color
    }

    var body: some View {
        Text(unicode)
            .font(.custom("tabler-icons", size: size))
            .foregroundStyle(color ?? Colors.iconDefault)
    }
}

struct TablerTabLabel: View {
    let icon: TablerIconOutline
    let title: String

    init(_ icon: TablerIconOutline, title: String) {
        self.icon = icon
        self.title = title
    }

    private var iconImage: Image {
        let renderer = ImageRenderer(
            content: Text(icon.rawValue)
                .font(.custom("tabler-icons", size: 28))
                .foregroundStyle(.white)
        )
        renderer.scale = UITraitCollection.current.displayScale
        guard let uiImage = renderer.uiImage else {
            return Image(systemName: "questionmark")
        }
        return Image(uiImage: uiImage.withRenderingMode(.alwaysTemplate))
    }

    var body: some View {
        Label {
            Text(title)
        } icon: {
            iconImage
        }
    }
}

extension TablerIcons {
    func size(_ size: CGFloat) -> TablerIcons {
        var copy = self
        copy.size = size
        return copy
    }

    func color(_ color: Color) -> TablerIcons {
        var copy = self
        copy.color = color
        return copy
    }
}

extension TablerIconOutline {
    public var iconName: String {
        String(describing: self)
            .replacingOccurrences(of: "([a-z0-9])([A-Z])", with: "$1-$2", options: .regularExpression)
            .lowercased()
            .replacingOccurrences(of: "^_", with: "", options: .regularExpression)
    }
}

extension TablerIconFilled {
    public var iconName: String {
        String(describing: self)
            .replacingOccurrences(of: "([a-z0-9])([A-Z])", with: "$1-$2", options: .regularExpression)
            .lowercased()
            .replacingOccurrences(of: "^_", with: "", options: .regularExpression)
    }
}

public enum TablerIconOutline: String, CaseIterable, Sendable {
    /// a-b
    case aB = "\u{EC36}"
    /// a-b-2
    case aB2 = "\u{F25F}"
    /// a-b-off
    case aBOff = "\u{F0A6}"
    /// abacus
    case abacus = "\u{F05C}"
    /// abacus-off
    case abacusOff = "\u{F3B6}"
    /// abc
    case abc = "\u{F567}"
    /// access-point
    case accessPoint = "\u{ED1B}"
    /// access-point-off
    case accessPointOff = "\u{ED1A}"
    /// accessible
    case accessible = "\u{EBA9}"
    /// accessible-off
    case accessibleOff = "\u{F0A7}"
    /// activity
    case activity = "\u{ED23}"
    /// activity-heartbeat
    case activityHeartbeat = "\u{F0DB}"
    /// ad
    case ad = "\u{EA02}"
    /// ad-2
    case ad2 = "\u{EF1F}"
    /// ad-circle
    case adCircle = "\u{F79E}"
    /// ad-circle-off
    case adCircleOff = "\u{F79D}"
    /// ad-off
    case adOff = "\u{F3B7}"
    /// address-book
    case addressBook = "\u{F021}"
    /// address-book-off
    case addressBookOff = "\u{F3B8}"
    /// adjustments
    case adjustments = "\u{EA03}"
    /// adjustments-alt
    case adjustmentsAlt = "\u{EC37}"
    /// adjustments-bolt
    case adjustmentsBolt = "\u{F7FB}"
    /// adjustments-cancel
    case adjustmentsCancel = "\u{F7FC}"
    /// adjustments-check
    case adjustmentsCheck = "\u{F7FD}"
    /// adjustments-code
    case adjustmentsCode = "\u{F7FE}"
    /// adjustments-cog
    case adjustmentsCog = "\u{F7FF}"
    /// adjustments-dollar
    case adjustmentsDollar = "\u{F800}"
    /// adjustments-down
    case adjustmentsDown = "\u{F801}"
    /// adjustments-exclamation
    case adjustmentsExclamation = "\u{F802}"
    /// adjustments-heart
    case adjustmentsHeart = "\u{F803}"
    /// adjustments-horizontal
    case adjustmentsHorizontal = "\u{EC38}"
    /// adjustments-minus
    case adjustmentsMinus = "\u{F804}"
    /// adjustments-off
    case adjustmentsOff = "\u{F0A8}"
    /// adjustments-pause
    case adjustmentsPause = "\u{F805}"
    /// adjustments-pin
    case adjustmentsPin = "\u{F806}"
    /// adjustments-plus
    case adjustmentsPlus = "\u{F807}"
    /// adjustments-question
    case adjustmentsQuestion = "\u{F808}"
    /// adjustments-search
    case adjustmentsSearch = "\u{F809}"
    /// adjustments-share
    case adjustmentsShare = "\u{F80A}"
    /// adjustments-spark
    case adjustmentsSpark = "\u{FFBE}"
    /// adjustments-star
    case adjustmentsStar = "\u{F80B}"
    /// adjustments-up
    case adjustmentsUp = "\u{F80C}"
    /// adjustments-x
    case adjustmentsX = "\u{F80D}"
    /// aerial-lift
    case aerialLift = "\u{EDFE}"
    /// affiliate
    case affiliate = "\u{EDFF}"
    /// ai
    case ai = "\u{FEE7}"
    /// air-balloon
    case airBalloon = "\u{F4A6}"
    /// air-conditioning
    case airConditioning = "\u{F3A2}"
    /// air-conditioning-disabled
    case airConditioningDisabled = "\u{F542}"
    /// air-traffic-control
    case airTrafficControl = "\u{FB01}"
    /// alarm
    case alarm = "\u{EA04}"
    /// alarm-average
    case alarmAverage = "\u{FC9E}"
    /// alarm-minus
    case alarmMinus = "\u{F630}"
    /// alarm-off
    case alarmOff = "\u{F0A9}"
    /// alarm-plus
    case alarmPlus = "\u{F631}"
    /// alarm-smoke
    case alarmSmoke = "\u{100B6}"
    /// alarm-snooze
    case alarmSnooze = "\u{F632}"
    /// album
    case album = "\u{F022}"
    /// album-off
    case albumOff = "\u{F3B9}"
    /// alert-circle
    case alertCircle = "\u{EA05}"
    /// alert-circle-off
    case alertCircleOff = "\u{FC65}"
    /// alert-hexagon
    case alertHexagon = "\u{F80E}"
    /// alert-hexagon-off
    case alertHexagonOff = "\u{FC66}"
    /// alert-octagon
    case alertOctagon = "\u{ECC6}"
    /// alert-small
    case alertSmall = "\u{F80F}"
    /// alert-small-off
    case alertSmallOff = "\u{FC67}"
    /// alert-square
    case alertSquare = "\u{F811}"
    /// alert-square-rounded
    case alertSquareRounded = "\u{F810}"
    /// alert-square-rounded-off
    case alertSquareRoundedOff = "\u{FC68}"
    /// alert-triangle
    case alertTriangle = "\u{EA06}"
    /// alert-triangle-off
    case alertTriangleOff = "\u{FC69}"
    /// alien
    case alien = "\u{EBDE}"
    /// align-box-bottom-center
    case alignBoxBottomCenter = "\u{F530}"
    /// align-box-bottom-left
    case alignBoxBottomLeft = "\u{F531}"
    /// align-box-bottom-right
    case alignBoxBottomRight = "\u{F532}"
    /// align-box-center-bottom
    case alignBoxCenterBottom = "\u{FACB}"
    /// align-box-center-middle
    case alignBoxCenterMiddle = "\u{F79F}"
    /// align-box-center-stretch
    case alignBoxCenterStretch = "\u{FACC}"
    /// align-box-center-top
    case alignBoxCenterTop = "\u{FACD}"
    /// align-box-left-bottom
    case alignBoxLeftBottom = "\u{F533}"
    /// align-box-left-middle
    case alignBoxLeftMiddle = "\u{F534}"
    /// align-box-left-stretch
    case alignBoxLeftStretch = "\u{FACE}"
    /// align-box-left-top
    case alignBoxLeftTop = "\u{F535}"
    /// align-box-right-bottom
    case alignBoxRightBottom = "\u{F536}"
    /// align-box-right-middle
    case alignBoxRightMiddle = "\u{F537}"
    /// align-box-right-stretch
    case alignBoxRightStretch = "\u{FACF}"
    /// align-box-right-top
    case alignBoxRightTop = "\u{F538}"
    /// align-box-top-center
    case alignBoxTopCenter = "\u{F539}"
    /// align-box-top-left
    case alignBoxTopLeft = "\u{F53A}"
    /// align-box-top-right
    case alignBoxTopRight = "\u{F53B}"
    /// align-center
    case alignCenter = "\u{EA07}"
    /// align-justified
    case alignJustified = "\u{EA08}"
    /// align-left
    case alignLeft = "\u{EA09}"
    /// align-left-2
    case alignLeft2 = "\u{FF00}"
    /// align-right
    case alignRight = "\u{EA0A}"
    /// align-right-2
    case alignRight2 = "\u{FEFF}"
    /// alpha
    case alpha = "\u{F543}"
    /// alphabet-arabic
    case alphabetArabic = "\u{FF2F}"
    /// alphabet-bangla
    case alphabetBangla = "\u{FF2E}"
    /// alphabet-cyrillic
    case alphabetCyrillic = "\u{F1DF}"
    /// alphabet-greek
    case alphabetGreek = "\u{F1E0}"
    /// alphabet-hebrew
    case alphabetHebrew = "\u{FF2D}"
    /// alphabet-korean
    case alphabetKorean = "\u{FF2C}"
    /// alphabet-latin
    case alphabetLatin = "\u{F1E1}"
    /// alphabet-polish
    case alphabetPolish = "\u{101B1}"
    /// alphabet-runes
    case alphabetRunes = "\u{101B0}"
    /// alphabet-thai
    case alphabetThai = "\u{FF2B}"
    /// alt
    case alt = "\u{FC54}"
    /// ambulance
    case ambulance = "\u{EBF5}"
    /// ampersand
    case ampersand = "\u{F229}"
    /// analyze
    case analyze = "\u{F3A3}"
    /// analyze-off
    case analyzeOff = "\u{F3BA}"
    /// anchor
    case anchor = "\u{EB76}"
    /// anchor-off
    case anchorOff = "\u{F0F7}"
    /// angle
    case angle = "\u{EF20}"
    /// ankh
    case ankh = "\u{F1CD}"
    /// antenna
    case antenna = "\u{F094}"
    /// antenna-bars-1
    case antennaBars1 = "\u{ECC7}"
    /// antenna-bars-2
    case antennaBars2 = "\u{ECC8}"
    /// antenna-bars-3
    case antennaBars3 = "\u{ECC9}"
    /// antenna-bars-4
    case antennaBars4 = "\u{ECCA}"
    /// antenna-bars-5
    case antennaBars5 = "\u{ECCB}"
    /// antenna-bars-off
    case antennaBarsOff = "\u{F0AA}"
    /// antenna-off
    case antennaOff = "\u{F3BB}"
    /// aperture
    case aperture = "\u{EB58}"
    /// aperture-off
    case apertureOff = "\u{F3BC}"
    /// api
    case api = "\u{EFFD}"
    /// api-app
    case apiApp = "\u{EFFC}"
    /// api-app-off
    case apiAppOff = "\u{F0AB}"
    /// api-off
    case apiOff = "\u{F0F8}"
    /// app-window
    case appWindow = "\u{EFE6}"
    /// apple
    case apple = "\u{EF21}"
    /// apps
    case apps = "\u{EBB6}"
    /// apps-off
    case appsOff = "\u{F0AC}"
    /// archery-arrow
    case archeryArrow = "\u{FC55}"
    /// archive
    case archive = "\u{EA0B}"
    /// archive-off
    case archiveOff = "\u{F0AD}"
    /// armchair
    case armchair = "\u{EF9E}"
    /// armchair-2
    case armchair2 = "\u{EFE7}"
    /// armchair-2-off
    case armchair2Off = "\u{F3BD}"
    /// armchair-off
    case armchairOff = "\u{F3BE}"
    /// arrow-autofit-content
    case arrowAutofitContent = "\u{EF31}"
    /// arrow-autofit-down
    case arrowAutofitDown = "\u{EF32}"
    /// arrow-autofit-height
    case arrowAutofitHeight = "\u{EF33}"
    /// arrow-autofit-left
    case arrowAutofitLeft = "\u{EF34}"
    /// arrow-autofit-right
    case arrowAutofitRight = "\u{EF35}"
    /// arrow-autofit-up
    case arrowAutofitUp = "\u{EF36}"
    /// arrow-autofit-width
    case arrowAutofitWidth = "\u{EF37}"
    /// arrow-back
    case arrowBack = "\u{EA0C}"
    /// arrow-back-up
    case arrowBackUp = "\u{EB77}"
    /// arrow-back-up-double
    case arrowBackUpDouble = "\u{F9EC}"
    /// arrow-badge-down
    case arrowBadgeDown = "\u{F60B}"
    /// arrow-badge-left
    case arrowBadgeLeft = "\u{F60C}"
    /// arrow-badge-right
    case arrowBadgeRight = "\u{F60D}"
    /// arrow-badge-up
    case arrowBadgeUp = "\u{F60E}"
    /// arrow-bar-both
    case arrowBarBoth = "\u{FADD}"
    /// arrow-bar-down
    case arrowBarDown = "\u{EA0D}"
    /// arrow-bar-left
    case arrowBarLeft = "\u{EA0E}"
    /// arrow-bar-right
    case arrowBarRight = "\u{EA0F}"
    /// arrow-bar-to-down
    case arrowBarToDown = "\u{EC88}"
    /// arrow-bar-to-down-dashed
    case arrowBarToDownDashed = "\u{10164}"
    /// arrow-bar-to-left
    case arrowBarToLeft = "\u{EC89}"
    /// arrow-bar-to-left-dashed
    case arrowBarToLeftDashed = "\u{10163}"
    /// arrow-bar-to-right
    case arrowBarToRight = "\u{EC8A}"
    /// arrow-bar-to-right-dashed
    case arrowBarToRightDashed = "\u{10162}"
    /// arrow-bar-to-up
    case arrowBarToUp = "\u{EC8B}"
    /// arrow-bar-to-up-dashed
    case arrowBarToUpDashed = "\u{10161}"
    /// arrow-bar-up
    case arrowBarUp = "\u{EA10}"
    /// arrow-bear-left
    case arrowBearLeft = "\u{F045}"
    /// arrow-bear-left-2
    case arrowBearLeft2 = "\u{F044}"
    /// arrow-bear-right
    case arrowBearRight = "\u{F047}"
    /// arrow-bear-right-2
    case arrowBearRight2 = "\u{F046}"
    /// arrow-big-down
    case arrowBigDown = "\u{EDDA}"
    /// arrow-big-down-line
    case arrowBigDownLine = "\u{EFE8}"
    /// arrow-big-down-lines
    case arrowBigDownLines = "\u{EFE9}"
    /// arrow-big-left
    case arrowBigLeft = "\u{EDDB}"
    /// arrow-big-left-line
    case arrowBigLeftLine = "\u{EFEA}"
    /// arrow-big-left-lines
    case arrowBigLeftLines = "\u{EFEB}"
    /// arrow-big-right
    case arrowBigRight = "\u{EDDC}"
    /// arrow-big-right-line
    case arrowBigRightLine = "\u{EFEC}"
    /// arrow-big-right-lines
    case arrowBigRightLines = "\u{EFED}"
    /// arrow-big-up
    case arrowBigUp = "\u{EDDD}"
    /// arrow-big-up-line
    case arrowBigUpLine = "\u{EFEE}"
    /// arrow-big-up-lines
    case arrowBigUpLines = "\u{EFEF}"
    /// arrow-bounce
    case arrowBounce = "\u{F3A4}"
    /// arrow-capsule
    case arrowCapsule = "\u{FADE}"
    /// arrow-curve-left
    case arrowCurveLeft = "\u{F048}"
    /// arrow-curve-right
    case arrowCurveRight = "\u{F049}"
    /// arrow-down
    case arrowDown = "\u{EA16}"
    /// arrow-down-bar
    case arrowDownBar = "\u{ED98}"
    /// arrow-down-circle
    case arrowDownCircle = "\u{EA11}"
    /// arrow-down-dashed
    case arrowDownDashed = "\u{1006A}"
    /// arrow-down-from-arc
    case arrowDownFromArc = "\u{FD86}"
    /// arrow-down-left
    case arrowDownLeft = "\u{EA13}"
    /// arrow-down-left-circle
    case arrowDownLeftCircle = "\u{EA12}"
    /// arrow-down-rhombus
    case arrowDownRhombus = "\u{F61D}"
    /// arrow-down-right
    case arrowDownRight = "\u{EA15}"
    /// arrow-down-right-circle
    case arrowDownRightCircle = "\u{EA14}"
    /// arrow-down-square
    case arrowDownSquare = "\u{ED9A}"
    /// arrow-down-tail
    case arrowDownTail = "\u{ED9B}"
    /// arrow-down-to-arc
    case arrowDownToArc = "\u{FD87}"
    /// arrow-elbow-left
    case arrowElbowLeft = "\u{F9ED}"
    /// arrow-elbow-right
    case arrowElbowRight = "\u{F9EE}"
    /// arrow-fork
    case arrowFork = "\u{F04A}"
    /// arrow-forward
    case arrowForward = "\u{EA17}"
    /// arrow-forward-up
    case arrowForwardUp = "\u{EB78}"
    /// arrow-forward-up-double
    case arrowForwardUpDouble = "\u{F9EF}"
    /// arrow-guide
    case arrowGuide = "\u{F22A}"
    /// arrow-iteration
    case arrowIteration = "\u{F578}"
    /// arrow-left
    case arrowLeft = "\u{EA19}"
    /// arrow-left-bar
    case arrowLeftBar = "\u{ED9C}"
    /// arrow-left-circle
    case arrowLeftCircle = "\u{EA18}"
    /// arrow-left-dashed
    case arrowLeftDashed = "\u{10069}"
    /// arrow-left-from-arc
    case arrowLeftFromArc = "\u{FD88}"
    /// arrow-left-rhombus
    case arrowLeftRhombus = "\u{F61E}"
    /// arrow-left-right
    case arrowLeftRight = "\u{F04B}"
    /// arrow-left-square
    case arrowLeftSquare = "\u{ED9D}"
    /// arrow-left-tail
    case arrowLeftTail = "\u{ED9E}"
    /// arrow-left-to-arc
    case arrowLeftToArc = "\u{FD89}"
    /// arrow-loop-left
    case arrowLoopLeft = "\u{ED9F}"
    /// arrow-loop-left-2
    case arrowLoopLeft2 = "\u{F04C}"
    /// arrow-loop-right
    case arrowLoopRight = "\u{EDA0}"
    /// arrow-loop-right-2
    case arrowLoopRight2 = "\u{F04D}"
    /// arrow-merge
    case arrowMerge = "\u{F04E}"
    /// arrow-merge-alt-left
    case arrowMergeAltLeft = "\u{FC9F}"
    /// arrow-merge-alt-right
    case arrowMergeAltRight = "\u{FCA0}"
    /// arrow-merge-both
    case arrowMergeBoth = "\u{F23B}"
    /// arrow-merge-left
    case arrowMergeLeft = "\u{F23C}"
    /// arrow-merge-right
    case arrowMergeRight = "\u{F23D}"
    /// arrow-move-down
    case arrowMoveDown = "\u{F2BA}"
    /// arrow-move-left
    case arrowMoveLeft = "\u{F2BB}"
    /// arrow-move-right
    case arrowMoveRight = "\u{F2BC}"
    /// arrow-move-up
    case arrowMoveUp = "\u{F2BD}"
    /// arrow-narrow-down
    case arrowNarrowDown = "\u{EA1A}"
    /// arrow-narrow-down-dashed
    case arrowNarrowDownDashed = "\u{10068}"
    /// arrow-narrow-left
    case arrowNarrowLeft = "\u{EA1B}"
    /// arrow-narrow-left-dashed
    case arrowNarrowLeftDashed = "\u{10067}"
    /// arrow-narrow-right
    case arrowNarrowRight = "\u{EA1C}"
    /// arrow-narrow-right-dashed
    case arrowNarrowRightDashed = "\u{10066}"
    /// arrow-narrow-up
    case arrowNarrowUp = "\u{EA1D}"
    /// arrow-narrow-up-dashed
    case arrowNarrowUpDashed = "\u{10065}"
    /// arrow-ramp-left
    case arrowRampLeft = "\u{ED3C}"
    /// arrow-ramp-left-2
    case arrowRampLeft2 = "\u{F04F}"
    /// arrow-ramp-left-3
    case arrowRampLeft3 = "\u{F050}"
    /// arrow-ramp-right
    case arrowRampRight = "\u{ED3D}"
    /// arrow-ramp-right-2
    case arrowRampRight2 = "\u{F051}"
    /// arrow-ramp-right-3
    case arrowRampRight3 = "\u{F052}"
    /// arrow-right
    case arrowRight = "\u{EA1F}"
    /// arrow-right-bar
    case arrowRightBar = "\u{EDA1}"
    /// arrow-right-circle
    case arrowRightCircle = "\u{EA1E}"
    /// arrow-right-dashed
    case arrowRightDashed = "\u{10064}"
    /// arrow-right-from-arc
    case arrowRightFromArc = "\u{FD8A}"
    /// arrow-right-rhombus
    case arrowRightRhombus = "\u{F61F}"
    /// arrow-right-square
    case arrowRightSquare = "\u{EDA2}"
    /// arrow-right-tail
    case arrowRightTail = "\u{EDA3}"
    /// arrow-right-to-arc
    case arrowRightToArc = "\u{FD8B}"
    /// arrow-rotary-first-left
    case arrowRotaryFirstLeft = "\u{F053}"
    /// arrow-rotary-first-right
    case arrowRotaryFirstRight = "\u{F054}"
    /// arrow-rotary-last-left
    case arrowRotaryLastLeft = "\u{F055}"
    /// arrow-rotary-last-right
    case arrowRotaryLastRight = "\u{F056}"
    /// arrow-rotary-left
    case arrowRotaryLeft = "\u{F057}"
    /// arrow-rotary-right
    case arrowRotaryRight = "\u{F058}"
    /// arrow-rotary-straight
    case arrowRotaryStraight = "\u{F059}"
    /// arrow-roundabout-left
    case arrowRoundaboutLeft = "\u{F22B}"
    /// arrow-roundabout-right
    case arrowRoundaboutRight = "\u{F22C}"
    /// arrow-sharp-turn-left
    case arrowSharpTurnLeft = "\u{F05A}"
    /// arrow-sharp-turn-right
    case arrowSharpTurnRight = "\u{F05B}"
    /// arrow-up
    case arrowUp = "\u{EA25}"
    /// arrow-up-bar
    case arrowUpBar = "\u{EDA4}"
    /// arrow-up-circle
    case arrowUpCircle = "\u{EA20}"
    /// arrow-up-dashed
    case arrowUpDashed = "\u{10063}"
    /// arrow-up-from-arc
    case arrowUpFromArc = "\u{FD8C}"
    /// arrow-up-left
    case arrowUpLeft = "\u{EA22}"
    /// arrow-up-left-circle
    case arrowUpLeftCircle = "\u{EA21}"
    /// arrow-up-rhombus
    case arrowUpRhombus = "\u{F620}"
    /// arrow-up-right
    case arrowUpRight = "\u{EA24}"
    /// arrow-up-right-circle
    case arrowUpRightCircle = "\u{EA23}"
    /// arrow-up-square
    case arrowUpSquare = "\u{EDA6}"
    /// arrow-up-tail
    case arrowUpTail = "\u{EDA7}"
    /// arrow-up-to-arc
    case arrowUpToArc = "\u{FD8D}"
    /// arrow-wave-left-down
    case arrowWaveLeftDown = "\u{EDA8}"
    /// arrow-wave-left-up
    case arrowWaveLeftUp = "\u{EDA9}"
    /// arrow-wave-right-down
    case arrowWaveRightDown = "\u{EDAA}"
    /// arrow-wave-right-up
    case arrowWaveRightUp = "\u{EDAB}"
    /// arrow-zig-zag
    case arrowZigZag = "\u{F4A7}"
    /// arrows-cross
    case arrowsCross = "\u{EFFE}"
    /// arrows-diagonal
    case arrowsDiagonal = "\u{EA27}"
    /// arrows-diagonal-2
    case arrowsDiagonal2 = "\u{EA26}"
    /// arrows-diagonal-minimize
    case arrowsDiagonalMinimize = "\u{EF39}"
    /// arrows-diagonal-minimize-2
    case arrowsDiagonalMinimize2 = "\u{EF38}"
    /// arrows-diff
    case arrowsDiff = "\u{F296}"
    /// arrows-double-ne-sw
    case arrowsDoubleNeSw = "\u{EDDE}"
    /// arrows-double-nw-se
    case arrowsDoubleNwSe = "\u{EDDF}"
    /// arrows-double-se-nw
    case arrowsDoubleSeNw = "\u{EDE0}"
    /// arrows-double-sw-ne
    case arrowsDoubleSwNe = "\u{EDE1}"
    /// arrows-down
    case arrowsDown = "\u{EDAD}"
    /// arrows-down-up
    case arrowsDownUp = "\u{EDAC}"
    /// arrows-exchange
    case arrowsExchange = "\u{F1F4}"
    /// arrows-exchange-2
    case arrowsExchange2 = "\u{F1F3}"
    /// arrows-horizontal
    case arrowsHorizontal = "\u{EB59}"
    /// arrows-join
    case arrowsJoin = "\u{EDAF}"
    /// arrows-join-2
    case arrowsJoin2 = "\u{EDAE}"
    /// arrows-left
    case arrowsLeft = "\u{EDB1}"
    /// arrows-left-down
    case arrowsLeftDown = "\u{EE00}"
    /// arrows-left-right
    case arrowsLeftRight = "\u{EDB0}"
    /// arrows-maximize
    case arrowsMaximize = "\u{EA28}"
    /// arrows-minimize
    case arrowsMinimize = "\u{EA29}"
    /// arrows-move
    case arrowsMove = "\u{F22F}"
    /// arrows-move-horizontal
    case arrowsMoveHorizontal = "\u{F22D}"
    /// arrows-move-vertical
    case arrowsMoveVertical = "\u{F22E}"
    /// arrows-random
    case arrowsRandom = "\u{F095}"
    /// arrows-right
    case arrowsRight = "\u{EDB3}"
    /// arrows-right-down
    case arrowsRightDown = "\u{EE01}"
    /// arrows-right-left
    case arrowsRightLeft = "\u{EDB2}"
    /// arrows-shuffle
    case arrowsShuffle = "\u{F000}"
    /// arrows-shuffle-2
    case arrowsShuffle2 = "\u{EFFF}"
    /// arrows-sort
    case arrowsSort = "\u{EB5A}"
    /// arrows-split
    case arrowsSplit = "\u{EDB5}"
    /// arrows-split-2
    case arrowsSplit2 = "\u{EDB4}"
    /// arrows-transfer-down
    case arrowsTransferDown = "\u{F2CC}"
    /// arrows-transfer-up
    case arrowsTransferUp = "\u{F2CD}"
    /// arrows-transfer-up-down
    case arrowsTransferUpDown = "\u{FFAC}"
    /// arrows-up
    case arrowsUp = "\u{EDB7}"
    /// arrows-up-down
    case arrowsUpDown = "\u{EDB6}"
    /// arrows-up-left
    case arrowsUpLeft = "\u{EE02}"
    /// arrows-up-right
    case arrowsUpRight = "\u{EE03}"
    /// arrows-vertical
    case arrowsVertical = "\u{EB5B}"
    /// artboard
    case artboard = "\u{EA2A}"
    /// artboard-off
    case artboardOff = "\u{F0AE}"
    /// article
    case article = "\u{F1E2}"
    /// article-off
    case articleOff = "\u{F3BF}"
    /// aspect-ratio
    case aspectRatio = "\u{ED30}"
    /// aspect-ratio-off
    case aspectRatioOff = "\u{F0AF}"
    /// assembly
    case assembly = "\u{F24D}"
    /// assembly-off
    case assemblyOff = "\u{F3C0}"
    /// asset
    case asset = "\u{F1CE}"
    /// asterisk
    case asterisk = "\u{EFD5}"
    /// asterisk-simple
    case asteriskSimple = "\u{EFD4}"
    /// at
    case at = "\u{EA2B}"
    /// at-off
    case atOff = "\u{F0B0}"
    /// atom
    case atom = "\u{EB79}"
    /// atom-2
    case atom2 = "\u{EBDF}"
    /// atom-off
    case atomOff = "\u{F0F9}"
    /// augmented-reality
    case augmentedReality = "\u{F023}"
    /// augmented-reality-2
    case augmentedReality2 = "\u{F37E}"
    /// augmented-reality-off
    case augmentedRealityOff = "\u{F3C1}"
    /// auth-2fa
    case auth2fa = "\u{ECA0}"
    /// automatic-gearbox
    case automaticGearbox = "\u{FC89}"
    /// automation
    case automation = "\u{FEF8}"
    /// avocado
    case avocado = "\u{FD8E}"
    /// award
    case award = "\u{EA2C}"
    /// award-off
    case awardOff = "\u{F0FA}"
    /// axe
    case axe = "\u{EF9F}"
    /// axis-x
    case axisX = "\u{EF45}"
    /// axis-y
    case axisY = "\u{EF46}"
    /// baby-bottle
    case babyBottle = "\u{F5D2}"
    /// baby-carriage
    case babyCarriage = "\u{F05D}"
    /// background
    case background = "\u{FD2C}"
    /// backhoe
    case backhoe = "\u{ED86}"
    /// backpack
    case backpack = "\u{EF47}"
    /// backpack-off
    case backpackOff = "\u{F3C2}"
    /// backslash
    case backslash = "\u{FAB9}"
    /// backspace
    case backspace = "\u{EA2D}"
    /// badge
    case badge = "\u{EFC2}"
    /// badge-2k
    case badge2k = "\u{100B5}"
    /// badge-3d
    case badge3d = "\u{F555}"
    /// badge-3k
    case badge3k = "\u{100B4}"
    /// badge-4k
    case badge4k = "\u{F556}"
    /// badge-5k
    case badge5k = "\u{100B3}"
    /// badge-8k
    case badge8k = "\u{F557}"
    /// badge-ad
    case badgeAd = "\u{F558}"
    /// badge-ad-off
    case badgeAdOff = "\u{FD8F}"
    /// badge-ar
    case badgeAr = "\u{F559}"
    /// badge-cc
    case badgeCc = "\u{F55A}"
    /// badge-hd
    case badgeHd = "\u{F55B}"
    /// badge-off
    case badgeOff = "\u{F0FB}"
    /// badge-sd
    case badgeSd = "\u{F55C}"
    /// badge-tm
    case badgeTm = "\u{F55D}"
    /// badge-vo
    case badgeVo = "\u{F55E}"
    /// badge-vr
    case badgeVr = "\u{F55F}"
    /// badge-wc
    case badgeWc = "\u{F560}"
    /// badges
    case badges = "\u{EFC3}"
    /// badges-off
    case badgesOff = "\u{F0FC}"
    /// baguette
    case baguette = "\u{F3A5}"
    /// ball-american-football
    case ballAmericanFootball = "\u{EE04}"
    /// ball-american-football-off
    case ballAmericanFootballOff = "\u{F3C3}"
    /// ball-baseball
    case ballBaseball = "\u{EFA0}"
    /// ball-basketball
    case ballBasketball = "\u{EC28}"
    /// ball-bowling
    case ballBowling = "\u{EC29}"
    /// ball-football
    case ballFootball = "\u{EE06}"
    /// ball-football-off
    case ballFootballOff = "\u{EE05}"
    /// ball-tennis
    case ballTennis = "\u{EC2A}"
    /// ball-volleyball
    case ballVolleyball = "\u{EC2B}"
    /// balloon
    case balloon = "\u{EF3A}"
    /// balloon-off
    case balloonOff = "\u{F0FD}"
    /// ballpen
    case ballpen = "\u{F06E}"
    /// ballpen-off
    case ballpenOff = "\u{F0B1}"
    /// ban
    case ban = "\u{EA2E}"
    /// bandage
    case bandage = "\u{EB7A}"
    /// bandage-off
    case bandageOff = "\u{F3C4}"
    /// barbell
    case barbell = "\u{EFF0}"
    /// barbell-off
    case barbellOff = "\u{F0B2}"
    /// barcode
    case barcode = "\u{EBC6}"
    /// barcode-off
    case barcodeOff = "\u{F0B3}"
    /// barrel
    case barrel = "\u{F0B4}"
    /// barrel-off
    case barrelOff = "\u{F0FE}"
    /// barrier-block
    case barrierBlock = "\u{F00E}"
    /// barrier-block-off
    case barrierBlockOff = "\u{F0B5}"
    /// baseline
    case baseline = "\u{F024}"
    /// baseline-density-large
    case baselineDensityLarge = "\u{F9F0}"
    /// baseline-density-medium
    case baselineDensityMedium = "\u{F9F1}"
    /// baseline-density-small
    case baselineDensitySmall = "\u{F9F2}"
    /// basket
    case basket = "\u{EBE1}"
    /// basket-bolt
    case basketBolt = "\u{FB43}"
    /// basket-cancel
    case basketCancel = "\u{FB44}"
    /// basket-check
    case basketCheck = "\u{FB45}"
    /// basket-code
    case basketCode = "\u{FB46}"
    /// basket-cog
    case basketCog = "\u{FB47}"
    /// basket-discount
    case basketDiscount = "\u{FB48}"
    /// basket-dollar
    case basketDollar = "\u{FB49}"
    /// basket-down
    case basketDown = "\u{FB4A}"
    /// basket-exclamation
    case basketExclamation = "\u{FB4B}"
    /// basket-heart
    case basketHeart = "\u{FB4C}"
    /// basket-minus
    case basketMinus = "\u{FB4D}"
    /// basket-off
    case basketOff = "\u{F0B6}"
    /// basket-pause
    case basketPause = "\u{FB4E}"
    /// basket-pin
    case basketPin = "\u{FB4F}"
    /// basket-plus
    case basketPlus = "\u{FB50}"
    /// basket-question
    case basketQuestion = "\u{FB51}"
    /// basket-search
    case basketSearch = "\u{FB52}"
    /// basket-share
    case basketShare = "\u{FB53}"
    /// basket-star
    case basketStar = "\u{FB54}"
    /// basket-up
    case basketUp = "\u{FB55}"
    /// basket-x
    case basketX = "\u{FB56}"
    /// bat
    case bat = "\u{F284}"
    /// bath
    case bath = "\u{EF48}"
    /// bath-off
    case bathOff = "\u{F0FF}"
    /// battery
    case battery = "\u{EA34}"
    /// battery-1
    case battery1 = "\u{EA2F}"
    /// battery-2
    case battery2 = "\u{EA30}"
    /// battery-3
    case battery3 = "\u{EA31}"
    /// battery-4
    case battery4 = "\u{EA32}"
    /// battery-automotive
    case batteryAutomotive = "\u{EE07}"
    /// battery-charging
    case batteryCharging = "\u{EA33}"
    /// battery-charging-2
    case batteryCharging2 = "\u{EF3B}"
    /// battery-eco
    case batteryEco = "\u{EF3C}"
    /// battery-exclamation
    case batteryExclamation = "\u{FF1D}"
    /// battery-off
    case batteryOff = "\u{ED1C}"
    /// battery-spark
    case batterySpark = "\u{FFBD}"
    /// battery-vertical
    case batteryVertical = "\u{FF13}"
    /// battery-vertical-1
    case batteryVertical1 = "\u{FF1C}"
    /// battery-vertical-2
    case batteryVertical2 = "\u{FF1B}"
    /// battery-vertical-3
    case batteryVertical3 = "\u{FF1A}"
    /// battery-vertical-4
    case batteryVertical4 = "\u{FF19}"
    /// battery-vertical-charging
    case batteryVerticalCharging = "\u{FF17}"
    /// battery-vertical-charging-2
    case batteryVerticalCharging2 = "\u{FF18}"
    /// battery-vertical-eco
    case batteryVerticalEco = "\u{FF16}"
    /// battery-vertical-exclamation
    case batteryVerticalExclamation = "\u{FF15}"
    /// battery-vertical-off
    case batteryVerticalOff = "\u{FF14}"
    /// beach
    case beach = "\u{EF3D}"
    /// beach-off
    case beachOff = "\u{F0B7}"
    /// bed
    case bed = "\u{EB5C}"
    /// bed-flat
    case bedFlat = "\u{FCA1}"
    /// bed-off
    case bedOff = "\u{F100}"
    /// beer
    case beer = "\u{EFA1}"
    /// beer-off
    case beerOff = "\u{F101}"
    /// bell
    case bell = "\u{EA35}"
    /// bell-bolt
    case bellBolt = "\u{F812}"
    /// bell-cancel
    case bellCancel = "\u{F813}"
    /// bell-check
    case bellCheck = "\u{F814}"
    /// bell-code
    case bellCode = "\u{F815}"
    /// bell-cog
    case bellCog = "\u{F816}"
    /// bell-dollar
    case bellDollar = "\u{F817}"
    /// bell-down
    case bellDown = "\u{F818}"
    /// bell-exclamation
    case bellExclamation = "\u{F819}"
    /// bell-heart
    case bellHeart = "\u{F81A}"
    /// bell-minus
    case bellMinus = "\u{EDE2}"
    /// bell-off
    case bellOff = "\u{ECE9}"
    /// bell-pause
    case bellPause = "\u{F81B}"
    /// bell-pin
    case bellPin = "\u{F81C}"
    /// bell-plus
    case bellPlus = "\u{EDE3}"
    /// bell-question
    case bellQuestion = "\u{F81D}"
    /// bell-ringing
    case bellRinging = "\u{ED07}"
    /// bell-ringing-2
    case bellRinging2 = "\u{EDE4}"
    /// bell-school
    case bellSchool = "\u{F05E}"
    /// bell-search
    case bellSearch = "\u{F81E}"
    /// bell-share
    case bellShare = "\u{F81F}"
    /// bell-star
    case bellStar = "\u{F820}"
    /// bell-up
    case bellUp = "\u{F821}"
    /// bell-x
    case bellX = "\u{EDE5}"
    /// bell-z
    case bellZ = "\u{EFF1}"
    /// beta
    case beta = "\u{F544}"
    /// bible
    case bible = "\u{EFC4}"
    /// bike
    case bike = "\u{EA36}"
    /// bike-off
    case bikeOff = "\u{F0B8}"
    /// binary
    case binary = "\u{EE08}"
    /// binary-off
    case binaryOff = "\u{F3C5}"
    /// binary-tree
    case binaryTree = "\u{F5D4}"
    /// binary-tree-2
    case binaryTree2 = "\u{F5D3}"
    /// binoculars
    case binoculars = "\u{FEFE}"
    /// biohazard
    case biohazard = "\u{ECB8}"
    /// biohazard-off
    case biohazardOff = "\u{F0B9}"
    /// blade
    case blade = "\u{F4BD}"
    /// bleach
    case bleach = "\u{F2F3}"
    /// bleach-chlorine
    case bleachChlorine = "\u{F2F0}"
    /// bleach-no-chlorine
    case bleachNoChlorine = "\u{F2F1}"
    /// bleach-off
    case bleachOff = "\u{F2F2}"
    /// blend-mode
    case blendMode = "\u{FEB0}"
    /// blender
    case blender = "\u{FCA2}"
    /// blind
    case blind = "\u{101AF}"
    /// blob
    case blob = "\u{FEAF}"
    /// blockquote
    case blockquote = "\u{EE09}"
    /// blocks
    case blocks = "\u{100B2}"
    /// bluetooth
    case bluetooth = "\u{EA37}"
    /// bluetooth-connected
    case bluetoothConnected = "\u{ECEA}"
    /// bluetooth-off
    case bluetoothOff = "\u{ECEB}"
    /// bluetooth-x
    case bluetoothX = "\u{F081}"
    /// blur
    case blur = "\u{EF8C}"
    /// blur-off
    case blurOff = "\u{F3C6}"
    /// bmp
    case bmp = "\u{F3A6}"
    /// body-scan
    case bodyScan = "\u{FCA3}"
    /// bold
    case bold = "\u{EB7B}"
    /// bold-off
    case boldOff = "\u{F0BA}"
    /// bolt
    case bolt = "\u{EA38}"
    /// bolt-off
    case boltOff = "\u{ECEC}"
    /// bomb
    case bomb = "\u{F59C}"
    /// bone
    case bone = "\u{EDB8}"
    /// bone-off
    case boneOff = "\u{F0BB}"
    /// bong
    case bong = "\u{F3A7}"
    /// bong-off
    case bongOff = "\u{F3C7}"
    /// book
    case book = "\u{EA39}"
    /// book-2
    case book2 = "\u{EFC5}"
    /// book-download
    case bookDownload = "\u{F070}"
    /// book-off
    case bookOff = "\u{F0BC}"
    /// book-upload
    case bookUpload = "\u{F071}"
    /// bookmark
    case bookmark = "\u{EA3A}"
    /// bookmark-ai
    case bookmarkAi = "\u{FC8A}"
    /// bookmark-edit
    case bookmarkEdit = "\u{FA5E}"
    /// bookmark-minus
    case bookmarkMinus = "\u{FA5F}"
    /// bookmark-off
    case bookmarkOff = "\u{ECED}"
    /// bookmark-plus
    case bookmarkPlus = "\u{FA60}"
    /// bookmark-question
    case bookmarkQuestion = "\u{FA61}"
    /// bookmarks
    case bookmarks = "\u{ED08}"
    /// bookmarks-off
    case bookmarksOff = "\u{F0BD}"
    /// books
    case books = "\u{EFF2}"
    /// books-off
    case booksOff = "\u{F0BE}"
    /// boom
    case boom = "\u{FDBE}"
    /// border-all
    case borderAll = "\u{EA3B}"
    /// border-bottom
    case borderBottom = "\u{EA3C}"
    /// border-bottom-plus
    case borderBottomPlus = "\u{FDBD}"
    /// border-corner-ios
    case borderCornerIos = "\u{FD98}"
    /// border-corner-pill
    case borderCornerPill = "\u{FD62}"
    /// border-corner-rounded
    case borderCornerRounded = "\u{FD63}"
    /// border-corner-square
    case borderCornerSquare = "\u{FD64}"
    /// border-corners
    case borderCorners = "\u{F7A0}"
    /// border-horizontal
    case borderHorizontal = "\u{EA3D}"
    /// border-inner
    case borderInner = "\u{EA3E}"
    /// border-left
    case borderLeft = "\u{EA3F}"
    /// border-left-plus
    case borderLeftPlus = "\u{FDBC}"
    /// border-none
    case borderNone = "\u{EA40}"
    /// border-outer
    case borderOuter = "\u{EA41}"
    /// border-radius
    case borderRadius = "\u{EB7C}"
    /// border-right
    case borderRight = "\u{EA42}"
    /// border-right-plus
    case borderRightPlus = "\u{FDBB}"
    /// border-sides
    case borderSides = "\u{F7A1}"
    /// border-style
    case borderStyle = "\u{EE0A}"
    /// border-style-2
    case borderStyle2 = "\u{EF22}"
    /// border-top
    case borderTop = "\u{EA43}"
    /// border-top-plus
    case borderTopPlus = "\u{FDBA}"
    /// border-vertical
    case borderVertical = "\u{EA44}"
    /// bottle
    case bottle = "\u{EF0B}"
    /// bottle-off
    case bottleOff = "\u{F3C8}"
    /// bounce-left
    case bounceLeft = "\u{F59D}"
    /// bounce-right
    case bounceRight = "\u{F59E}"
    /// bow
    case bow = "\u{F096}"
    /// bowl
    case bowl = "\u{F4FA}"
    /// bowl-chopsticks
    case bowlChopsticks = "\u{FD90}"
    /// bowl-spoon
    case bowlSpoon = "\u{FD91}"
    /// bowling
    case bowling = "\u{100B1}"
    /// box
    case box = "\u{EA45}"
    /// box-align-bottom
    case boxAlignBottom = "\u{F2A8}"
    /// box-align-bottom-left
    case boxAlignBottomLeft = "\u{F2CE}"
    /// box-align-bottom-right
    case boxAlignBottomRight = "\u{F2CF}"
    /// box-align-left
    case boxAlignLeft = "\u{F2A9}"
    /// box-align-right
    case boxAlignRight = "\u{F2AA}"
    /// box-align-top
    case boxAlignTop = "\u{F2AB}"
    /// box-align-top-left
    case boxAlignTopLeft = "\u{F2D0}"
    /// box-align-top-right
    case boxAlignTopRight = "\u{F2D1}"
    /// box-margin
    case boxMargin = "\u{EE0B}"
    /// box-model
    case boxModel = "\u{EE0C}"
    /// box-model-2
    case boxModel2 = "\u{EF23}"
    /// box-model-2-off
    case boxModel2Off = "\u{F3C9}"
    /// box-model-off
    case boxModelOff = "\u{F3CA}"
    /// box-multiple
    case boxMultiple = "\u{EE17}"
    /// box-multiple-0
    case boxMultiple0 = "\u{EE0D}"
    /// box-multiple-1
    case boxMultiple1 = "\u{EE0E}"
    /// box-multiple-2
    case boxMultiple2 = "\u{EE0F}"
    /// box-multiple-3
    case boxMultiple3 = "\u{EE10}"
    /// box-multiple-4
    case boxMultiple4 = "\u{EE11}"
    /// box-multiple-5
    case boxMultiple5 = "\u{EE12}"
    /// box-multiple-6
    case boxMultiple6 = "\u{EE13}"
    /// box-multiple-7
    case boxMultiple7 = "\u{EE14}"
    /// box-multiple-8
    case boxMultiple8 = "\u{EE15}"
    /// box-multiple-9
    case boxMultiple9 = "\u{EE16}"
    /// box-off
    case boxOff = "\u{F102}"
    /// box-padding
    case boxPadding = "\u{EE18}"
    /// braces
    case braces = "\u{EBCC}"
    /// braces-off
    case bracesOff = "\u{F0BF}"
    /// brackets
    case brackets = "\u{EBCD}"
    /// brackets-angle
    case bracketsAngle = "\u{FCB2}"
    /// brackets-angle-off
    case bracketsAngleOff = "\u{FCB1}"
    /// brackets-contain
    case bracketsContain = "\u{F1E5}"
    /// brackets-contain-end
    case bracketsContainEnd = "\u{F1E3}"
    /// brackets-contain-start
    case bracketsContainStart = "\u{F1E4}"
    /// brackets-off
    case bracketsOff = "\u{F0C0}"
    /// braille
    case braille = "\u{F545}"
    /// brain
    case brain = "\u{F59F}"
    /// brand-4chan
    case brand4chan = "\u{F494}"
    /// brand-abstract
    case brandAbstract = "\u{F495}"
    /// brand-adobe
    case brandAdobe = "\u{F0DC}"
    /// brand-adobe-after-effect
    case brandAdobeAfterEffect = "\u{FF2A}"
    /// brand-adobe-illustrator
    case brandAdobeIllustrator = "\u{FF29}"
    /// brand-adobe-indesign
    case brandAdobeIndesign = "\u{FF28}"
    /// brand-adobe-photoshop
    case brandAdobePhotoshop = "\u{FF27}"
    /// brand-adobe-premiere
    case brandAdobePremiere = "\u{FF26}"
    /// brand-adobe-xd
    case brandAdobeXd = "\u{FF25}"
    /// brand-adonis-js
    case brandAdonisJs = "\u{F496}"
    /// brand-airbnb
    case brandAirbnb = "\u{ED68}"
    /// brand-airtable
    case brandAirtable = "\u{EF6A}"
    /// brand-algolia
    case brandAlgolia = "\u{F390}"
    /// brand-alipay
    case brandAlipay = "\u{F7A2}"
    /// brand-alpine-js
    case brandAlpineJs = "\u{F324}"
    /// brand-amazon
    case brandAmazon = "\u{F230}"
    /// brand-amd
    case brandAmd = "\u{F653}"
    /// brand-amie
    case brandAmie = "\u{FFAB}"
    /// brand-amigo
    case brandAmigo = "\u{F5F9}"
    /// brand-among-us
    case brandAmongUs = "\u{F205}"
    /// brand-android
    case brandAndroid = "\u{EC16}"
    /// brand-angular
    case brandAngular = "\u{EF6B}"
    /// brand-ansible
    case brandAnsible = "\u{FA70}"
    /// brand-ao3
    case brandAo3 = "\u{F5E8}"
    /// brand-appgallery
    case brandAppgallery = "\u{F231}"
    /// brand-apple
    case brandApple = "\u{EC17}"
    /// brand-apple-arcade
    case brandAppleArcade = "\u{ED69}"
    /// brand-apple-news
    case brandAppleNews = "\u{FF24}"
    /// brand-apple-podcast
    case brandApplePodcast = "\u{F1E6}"
    /// brand-appstore
    case brandAppstore = "\u{ED24}"
    /// brand-arc
    case brandArc = "\u{FEAE}"
    /// brand-asana
    case brandAsana = "\u{EDC5}"
    /// brand-astro
    case brandAstro = "\u{FDB9}"
    /// brand-auth0
    case brandAuth0 = "\u{FCB3}"
    /// brand-aws
    case brandAws = "\u{FA4C}"
    /// brand-azure
    case brandAzure = "\u{FA4D}"
    /// brand-backbone
    case brandBackbone = "\u{F325}"
    /// brand-badoo
    case brandBadoo = "\u{F206}"
    /// brand-baidu
    case brandBaidu = "\u{F5E9}"
    /// brand-bandcamp
    case brandBandcamp = "\u{F207}"
    /// brand-bandlab
    case brandBandlab = "\u{F5FA}"
    /// brand-beats
    case brandBeats = "\u{F208}"
    /// brand-bebo
    case brandBebo = "\u{FFAA}"
    /// brand-behance
    case brandBehance = "\u{EC6E}"
    /// brand-bilibili
    case brandBilibili = "\u{F6D2}"
    /// brand-binance
    case brandBinance = "\u{F5A0}"
    /// brand-bing
    case brandBing = "\u{EDC6}"
    /// brand-bitbucket
    case brandBitbucket = "\u{EDC7}"
    /// brand-blackberry
    case brandBlackberry = "\u{F568}"
    /// brand-blender
    case brandBlender = "\u{F326}"
    /// brand-blogger
    case brandBlogger = "\u{F35A}"
    /// brand-bluesky
    case brandBluesky = "\u{FD75}"
    /// brand-booking
    case brandBooking = "\u{EDC8}"
    /// brand-bootstrap
    case brandBootstrap = "\u{EF3E}"
    /// brand-bulma
    case brandBulma = "\u{F327}"
    /// brand-bumble
    case brandBumble = "\u{F5FB}"
    /// brand-bunpo
    case brandBunpo = "\u{F4CF}"
    /// brand-c-sharp
    case brandCSharp = "\u{F003}"
    /// brand-cake
    case brandCake = "\u{F7A3}"
    /// brand-cakephp
    case brandCakephp = "\u{F7AF}"
    /// brand-campaignmonitor
    case brandCampaignmonitor = "\u{F328}"
    /// brand-carbon
    case brandCarbon = "\u{F348}"
    /// brand-cashapp
    case brandCashapp = "\u{F391}"
    /// brand-chrome
    case brandChrome = "\u{EC18}"
    /// brand-cinema-4d
    case brandCinema4d = "\u{FA71}"
    /// brand-citymapper
    case brandCitymapper = "\u{F5FC}"
    /// brand-cloudflare
    case brandCloudflare = "\u{FA4E}"
    /// brand-codecov
    case brandCodecov = "\u{F329}"
    /// brand-codepen
    case brandCodepen = "\u{EC6F}"
    /// brand-codesandbox
    case brandCodesandbox = "\u{ED6A}"
    /// brand-cohost
    case brandCohost = "\u{F5D5}"
    /// brand-coinbase
    case brandCoinbase = "\u{F209}"
    /// brand-comedy-central
    case brandComedyCentral = "\u{F217}"
    /// brand-coreos
    case brandCoreos = "\u{F5FD}"
    /// brand-couchdb
    case brandCouchdb = "\u{F60F}"
    /// brand-couchsurfing
    case brandCouchsurfing = "\u{F392}"
    /// brand-cpp
    case brandCpp = "\u{F5FE}"
    /// brand-craft
    case brandCraft = "\u{FA72}"
    /// brand-crunchbase
    case brandCrunchbase = "\u{F7E3}"
    /// brand-css3
    case brandCss3 = "\u{ED6B}"
    /// brand-ctemplar
    case brandCtemplar = "\u{F4D0}"
    /// brand-cucumber
    case brandCucumber = "\u{EF6C}"
    /// brand-cupra
    case brandCupra = "\u{F4D1}"
    /// brand-cypress
    case brandCypress = "\u{F333}"
    /// brand-d3
    case brandD3 = "\u{F24E}"
    /// brand-databricks
    case brandDatabricks = "\u{FC41}"
    /// brand-days-counter
    case brandDaysCounter = "\u{F4D2}"
    /// brand-dcos
    case brandDcos = "\u{F32A}"
    /// brand-debian
    case brandDebian = "\u{EF57}"
    /// brand-deezer
    case brandDeezer = "\u{F78B}"
    /// brand-deliveroo
    case brandDeliveroo = "\u{F4D3}"
    /// brand-deno
    case brandDeno = "\u{F24F}"
    /// brand-denodo
    case brandDenodo = "\u{F610}"
    /// brand-deviantart
    case brandDeviantart = "\u{ECFB}"
    /// brand-digg
    case brandDigg = "\u{FA73}"
    /// brand-dingtalk
    case brandDingtalk = "\u{F5EA}"
    /// brand-discord
    case brandDiscord = "\u{ECE3}"
    /// brand-disney
    case brandDisney = "\u{F20A}"
    /// brand-disqus
    case brandDisqus = "\u{EDC9}"
    /// brand-django
    case brandDjango = "\u{F349}"
    /// brand-docker
    case brandDocker = "\u{EDCA}"
    /// brand-doctrine
    case brandDoctrine = "\u{EF6D}"
    /// brand-dolby-digital
    case brandDolbyDigital = "\u{F4D4}"
    /// brand-douban
    case brandDouban = "\u{F5FF}"
    /// brand-dribbble
    case brandDribbble = "\u{EC19}"
    /// brand-dropbox
    case brandDropbox = "\u{1018A}"
    /// brand-drops
    case brandDrops = "\u{F4D5}"
    /// brand-drupal
    case brandDrupal = "\u{F393}"
    /// brand-edge
    case brandEdge = "\u{ECFC}"
    /// brand-elastic
    case brandElastic = "\u{F611}"
    /// brand-electronic-arts
    case brandElectronicArts = "\u{FA74}"
    /// brand-ember
    case brandEmber = "\u{F497}"
    /// brand-envato
    case brandEnvato = "\u{F394}"
    /// brand-etsy
    case brandEtsy = "\u{F654}"
    /// brand-evernote
    case brandEvernote = "\u{F600}"
    /// brand-facebook
    case brandFacebook = "\u{EC1A}"
    /// brand-feedly
    case brandFeedly = "\u{FA75}"
    /// brand-figma
    case brandFigma = "\u{EC93}"
    /// brand-filezilla
    case brandFilezilla = "\u{FA76}"
    /// brand-finder
    case brandFinder = "\u{F218}"
    /// brand-firebase
    case brandFirebase = "\u{EF6E}"
    /// brand-firefox
    case brandFirefox = "\u{ECFD}"
    /// brand-fiverr
    case brandFiverr = "\u{F7A4}"
    /// brand-flickr
    case brandFlickr = "\u{ECFE}"
    /// brand-flightradar24
    case brandFlightradar24 = "\u{F4D6}"
    /// brand-flipboard
    case brandFlipboard = "\u{F20B}"
    /// brand-flutter
    case brandFlutter = "\u{F395}"
    /// brand-fortnite
    case brandFortnite = "\u{F260}"
    /// brand-foursquare
    case brandFoursquare = "\u{ECFF}"
    /// brand-framer
    case brandFramer = "\u{EC1B}"
    /// brand-framer-motion
    case brandFramerMotion = "\u{F78C}"
    /// brand-funimation
    case brandFunimation = "\u{F655}"
    /// brand-gatsby
    case brandGatsby = "\u{F396}"
    /// brand-git
    case brandGit = "\u{EF6F}"
    /// brand-github
    case brandGithub = "\u{EC1C}"
    /// brand-github-copilot
    case brandGithubCopilot = "\u{F4A8}"
    /// brand-gitlab
    case brandGitlab = "\u{EC1D}"
    /// brand-gmail
    case brandGmail = "\u{EFA2}"
    /// brand-golang
    case brandGolang = "\u{F78D}"
    /// brand-google
    case brandGoogle = "\u{EC1F}"
    /// brand-google-analytics
    case brandGoogleAnalytics = "\u{EDCB}"
    /// brand-google-big-query
    case brandGoogleBigQuery = "\u{F612}"
    /// brand-google-drive
    case brandGoogleDrive = "\u{EC1E}"
    /// brand-google-fit
    case brandGoogleFit = "\u{F297}"
    /// brand-google-home
    case brandGoogleHome = "\u{F601}"
    /// brand-google-maps
    case brandGoogleMaps = "\u{FA4F}"
    /// brand-google-one
    case brandGoogleOne = "\u{F232}"
    /// brand-google-photos
    case brandGooglePhotos = "\u{F20C}"
    /// brand-google-play
    case brandGooglePlay = "\u{ED25}"
    /// brand-google-podcasts
    case brandGooglePodcasts = "\u{F656}"
    /// brand-grammarly
    case brandGrammarly = "\u{F32B}"
    /// brand-graphql
    case brandGraphql = "\u{F32C}"
    /// brand-gravatar
    case brandGravatar = "\u{EDCC}"
    /// brand-grindr
    case brandGrindr = "\u{F20D}"
    /// brand-guardian
    case brandGuardian = "\u{F4FB}"
    /// brand-gumroad
    case brandGumroad = "\u{F5D6}"
    /// brand-hackerrank
    case brandHackerrank = "\u{FF23}"
    /// brand-hbo
    case brandHbo = "\u{F657}"
    /// brand-headlessui
    case brandHeadlessui = "\u{F32D}"
    /// brand-hexo
    case brandHexo = "\u{FA50}"
    /// brand-hipchat
    case brandHipchat = "\u{EDCD}"
    /// brand-html5
    case brandHtml5 = "\u{ED6C}"
    /// brand-inertia
    case brandInertia = "\u{F34A}"
    /// brand-instagram
    case brandInstagram = "\u{EC20}"
    /// brand-intercom
    case brandIntercom = "\u{F1CF}"
    /// brand-itch
    case brandItch = "\u{FA22}"
    /// brand-javascript
    case brandJavascript = "\u{EF0C}"
    /// brand-juejin
    case brandJuejin = "\u{F7B0}"
    /// brand-kako-talk
    case brandKakoTalk = "\u{FD2D}"
    /// brand-kbin
    case brandKbin = "\u{FAD0}"
    /// brand-kick
    case brandKick = "\u{FA23}"
    /// brand-kickstarter
    case brandKickstarter = "\u{EDCE}"
    /// brand-kotlin
    case brandKotlin = "\u{ED6D}"
    /// brand-laravel
    case brandLaravel = "\u{F34B}"
    /// brand-lastfm
    case brandLastfm = "\u{F001}"
    /// brand-leetcode
    case brandLeetcode = "\u{FA51}"
    /// brand-letterboxd
    case brandLetterboxd = "\u{FA24}"
    /// brand-line
    case brandLine = "\u{F7E8}"
    /// brand-linkedin
    case brandLinkedin = "\u{EC8C}"
    /// brand-linktree
    case brandLinktree = "\u{F1E7}"
    /// brand-linqpad
    case brandLinqpad = "\u{F562}"
    /// brand-livewire
    case brandLivewire = "\u{FD76}"
    /// brand-loom
    case brandLoom = "\u{EF70}"
    /// brand-mailgun
    case brandMailgun = "\u{F32E}"
    /// brand-mantine
    case brandMantine = "\u{F32F}"
    /// brand-mastercard
    case brandMastercard = "\u{EF49}"
    /// brand-mastodon
    case brandMastodon = "\u{F250}"
    /// brand-matrix
    case brandMatrix = "\u{F5EB}"
    /// brand-mcdonalds
    case brandMcdonalds = "\u{F251}"
    /// brand-medium
    case brandMedium = "\u{EC70}"
    /// brand-meetup
    case brandMeetup = "\u{FC6A}"
    /// brand-mercedes
    case brandMercedes = "\u{F072}"
    /// brand-messenger
    case brandMessenger = "\u{EC71}"
    /// brand-meta
    case brandMeta = "\u{EFB0}"
    /// brand-metabrainz
    case brandMetabrainz = "\u{FF12}"
    /// brand-minecraft
    case brandMinecraft = "\u{FAEF}"
    /// brand-miniprogram
    case brandMiniprogram = "\u{F602}"
    /// brand-mixpanel
    case brandMixpanel = "\u{F397}"
    /// brand-monday
    case brandMonday = "\u{F219}"
    /// brand-mongodb
    case brandMongodb = "\u{F613}"
    /// brand-my-oppo
    case brandMyOppo = "\u{F4D7}"
    /// brand-mysql
    case brandMysql = "\u{F614}"
    /// brand-national-geographic
    case brandNationalGeographic = "\u{F603}"
    /// brand-nem
    case brandNem = "\u{F5A1}"
    /// brand-netbeans
    case brandNetbeans = "\u{EF71}"
    /// brand-netease-music
    case brandNeteaseMusic = "\u{F604}"
    /// brand-netflix
    case brandNetflix = "\u{EDCF}"
    /// brand-nexo
    case brandNexo = "\u{F5A2}"
    /// brand-nextcloud
    case brandNextcloud = "\u{F4D8}"
    /// brand-nextjs
    case brandNextjs = "\u{F0DD}"
    /// brand-nodejs
    case brandNodejs = "\u{FAE0}"
    /// brand-nord-vpn
    case brandNordVpn = "\u{F37F}"
    /// brand-notion
    case brandNotion = "\u{EF7B}"
    /// brand-npm
    case brandNpm = "\u{F569}"
    /// brand-nuxt
    case brandNuxt = "\u{F0DE}"
    /// brand-nytimes
    case brandNytimes = "\u{EF8D}"
    /// brand-oauth
    case brandOauth = "\u{FA52}"
    /// brand-office
    case brandOffice = "\u{F398}"
    /// brand-ok-ru
    case brandOkRu = "\u{F399}"
    /// brand-onedrive
    case brandOnedrive = "\u{F5D7}"
    /// brand-onlyfans
    case brandOnlyfans = "\u{F605}"
    /// brand-open-source
    case brandOpenSource = "\u{EDD0}"
    /// brand-openai
    case brandOpenai = "\u{F78E}"
    /// brand-openvpn
    case brandOpenvpn = "\u{F39A}"
    /// brand-opera
    case brandOpera = "\u{EC21}"
    /// brand-pagekit
    case brandPagekit = "\u{EDD1}"
    /// brand-parsinta
    case brandParsinta = "\u{FC42}"
    /// brand-patreon
    case brandPatreon = "\u{EDD2}"
    /// brand-paypal
    case brandPaypal = "\u{EC22}"
    /// brand-paypay
    case brandPaypay = "\u{F5EC}"
    /// brand-peanut
    case brandPeanut = "\u{F39B}"
    /// brand-pepsi
    case brandPepsi = "\u{F261}"
    /// brand-php
    case brandPhp = "\u{EF72}"
    /// brand-picsart
    case brandPicsart = "\u{F4D9}"
    /// brand-pinterest
    case brandPinterest = "\u{EC8D}"
    /// brand-planetscale
    case brandPlanetscale = "\u{F78F}"
    /// brand-pnpm
    case brandPnpm = "\u{FD77}"
    /// brand-pocket
    case brandPocket = "\u{ED00}"
    /// brand-polymer
    case brandPolymer = "\u{F498}"
    /// brand-powershell
    case brandPowershell = "\u{F5ED}"
    /// brand-printables
    case brandPrintables = "\u{FD1B}"
    /// brand-prisma
    case brandPrisma = "\u{F499}"
    /// brand-producthunt
    case brandProducthunt = "\u{EDD3}"
    /// brand-pushbullet
    case brandPushbullet = "\u{F330}"
    /// brand-pushover
    case brandPushover = "\u{F20E}"
    /// brand-python
    case brandPython = "\u{ED01}"
    /// brand-qq
    case brandQq = "\u{F606}"
    /// brand-radix-ui
    case brandRadixUi = "\u{F790}"
    /// brand-react
    case brandReact = "\u{F34C}"
    /// brand-react-native
    case brandReactNative = "\u{EF73}"
    /// brand-reason
    case brandReason = "\u{F49A}"
    /// brand-reddit
    case brandReddit = "\u{EC8E}"
    /// brand-redhat
    case brandRedhat = "\u{F331}"
    /// brand-redux
    case brandRedux = "\u{F3A8}"
    /// brand-revolut
    case brandRevolut = "\u{F4DA}"
    /// brand-rumble
    case brandRumble = "\u{FAD1}"
    /// brand-rust
    case brandRust = "\u{FA53}"
    /// brand-safari
    case brandSafari = "\u{EC23}"
    /// brand-samsungpass
    case brandSamsungpass = "\u{F4DB}"
    /// brand-sass
    case brandSass = "\u{EDD4}"
    /// brand-sentry
    case brandSentry = "\u{EDD5}"
    /// brand-sharik
    case brandSharik = "\u{F4DC}"
    /// brand-shazam
    case brandShazam = "\u{EDD6}"
    /// brand-shopee
    case brandShopee = "\u{F252}"
    /// brand-sketch
    case brandSketch = "\u{EC24}"
    /// brand-skype
    case brandSkype = "\u{ED02}"
    /// brand-slack
    case brandSlack = "\u{EC72}"
    /// brand-snapchat
    case brandSnapchat = "\u{EC25}"
    /// brand-snapseed
    case brandSnapseed = "\u{F253}"
    /// brand-snowflake
    case brandSnowflake = "\u{F615}"
    /// brand-socket-io
    case brandSocketIo = "\u{F49B}"
    /// brand-solidjs
    case brandSolidjs = "\u{F5EE}"
    /// brand-soundcloud
    case brandSoundcloud = "\u{ED6E}"
    /// brand-spacehey
    case brandSpacehey = "\u{F4FC}"
    /// brand-speedtest
    case brandSpeedtest = "\u{FA77}"
    /// brand-spotify
    case brandSpotify = "\u{ED03}"
    /// brand-stackoverflow
    case brandStackoverflow = "\u{EF58}"
    /// brand-stackshare
    case brandStackshare = "\u{F607}"
    /// brand-steam
    case brandSteam = "\u{ED6F}"
    /// brand-stocktwits
    case brandStocktwits = "\u{FD78}"
    /// brand-storj
    case brandStorj = "\u{FA54}"
    /// brand-storybook
    case brandStorybook = "\u{F332}"
    /// brand-storytel
    case brandStorytel = "\u{F608}"
    /// brand-strava
    case brandStrava = "\u{F254}"
    /// brand-stripe
    case brandStripe = "\u{EDD7}"
    /// brand-sublime-text
    case brandSublimeText = "\u{EF74}"
    /// brand-sugarizer
    case brandSugarizer = "\u{F7A5}"
    /// brand-supabase
    case brandSupabase = "\u{F6D3}"
    /// brand-superhuman
    case brandSuperhuman = "\u{F50C}"
    /// brand-supernova
    case brandSupernova = "\u{F49C}"
    /// brand-surfshark
    case brandSurfshark = "\u{F255}"
    /// brand-svelte
    case brandSvelte = "\u{F0DF}"
    /// brand-swift
    case brandSwift = "\u{FA55}"
    /// brand-symfony
    case brandSymfony = "\u{F616}"
    /// brand-tabler
    case brandTabler = "\u{EC8F}"
    /// brand-tabnine
    case brandTabnine = "\u{101AE}"
    /// brand-tailwind
    case brandTailwind = "\u{ECA1}"
    /// brand-taobao
    case brandTaobao = "\u{F5EF}"
    /// brand-teams
    case brandTeams = "\u{FADF}"
    /// brand-ted
    case brandTed = "\u{F658}"
    /// brand-telegram
    case brandTelegram = "\u{EC26}"
    /// brand-terraform
    case brandTerraform = "\u{FA56}"
    /// brand-tesla
    case brandTesla = "\u{10099}"
    /// brand-tether
    case brandTether = "\u{F5A3}"
    /// brand-thingiverse
    case brandThingiverse = "\u{FD1C}"
    /// brand-threads
    case brandThreads = "\u{FB02}"
    /// brand-threejs
    case brandThreejs = "\u{F5F0}"
    /// brand-tidal
    case brandTidal = "\u{ED70}"
    /// brand-tiktok
    case brandTiktok = "\u{EC73}"
    /// brand-tinder
    case brandTinder = "\u{ED71}"
    /// brand-topbuzz
    case brandTopbuzz = "\u{F50D}"
    /// brand-torchain
    case brandTorchain = "\u{F5A4}"
    /// brand-toyota
    case brandToyota = "\u{F262}"
    /// brand-trello
    case brandTrello = "\u{F39D}"
    /// brand-tripadvisor
    case brandTripadvisor = "\u{F002}"
    /// brand-tumblr
    case brandTumblr = "\u{ED04}"
    /// brand-twilio
    case brandTwilio = "\u{F617}"
    /// brand-twitch
    case brandTwitch = "\u{ED05}"
    /// brand-twitter
    case brandTwitter = "\u{EC27}"
    /// brand-typescript
    case brandTypescript = "\u{F5F1}"
    /// brand-uber
    case brandUber = "\u{EF75}"
    /// brand-ubuntu
    case brandUbuntu = "\u{EF59}"
    /// brand-unity
    case brandUnity = "\u{F49D}"
    /// brand-unsplash
    case brandUnsplash = "\u{EDD8}"
    /// brand-upwork
    case brandUpwork = "\u{F39E}"
    /// brand-valorant
    case brandValorant = "\u{F39F}"
    /// brand-vercel
    case brandVercel = "\u{EF24}"
    /// brand-vimeo
    case brandVimeo = "\u{ED06}"
    /// brand-vinted
    case brandVinted = "\u{F20F}"
    /// brand-visa
    case brandVisa = "\u{F380}"
    /// brand-visual-studio
    case brandVisualStudio = "\u{EF76}"
    /// brand-vite
    case brandVite = "\u{F5F2}"
    /// brand-vivaldi
    case brandVivaldi = "\u{F210}"
    /// brand-vk
    case brandVk = "\u{ED72}"
    /// brand-vlc
    case brandVlc = "\u{FA78}"
    /// brand-volkswagen
    case brandVolkswagen = "\u{F50E}"
    /// brand-vsco
    case brandVsco = "\u{F334}"
    /// brand-vscode
    case brandVscode = "\u{F3A0}"
    /// brand-vue
    case brandVue = "\u{F0E0}"
    /// brand-walmart
    case brandWalmart = "\u{F211}"
    /// brand-waze
    case brandWaze = "\u{F5D8}"
    /// brand-webflow
    case brandWebflow = "\u{F2D2}"
    /// brand-wechat
    case brandWechat = "\u{F5F3}"
    /// brand-weibo
    case brandWeibo = "\u{F609}"
    /// brand-whatsapp
    case brandWhatsapp = "\u{EC74}"
    /// brand-wikipedia
    case brandWikipedia = "\u{FA79}"
    /// brand-windows
    case brandWindows = "\u{ECD8}"
    /// brand-windy
    case brandWindy = "\u{F4DD}"
    /// brand-wish
    case brandWish = "\u{F212}"
    /// brand-wix
    case brandWix = "\u{F3A1}"
    /// brand-wordpress
    case brandWordpress = "\u{F2D3}"
    /// brand-x
    case brandX = "\u{FC0F}"
    /// brand-xamarin
    case brandXamarin = "\u{FA7A}"
    /// brand-xbox
    case brandXbox = "\u{F298}"
    /// brand-xdeep
    case brandXdeep = "\u{FC10}"
    /// brand-xing
    case brandXing = "\u{F21A}"
    /// brand-yahoo
    case brandYahoo = "\u{ED73}"
    /// brand-yandex
    case brandYandex = "\u{FAE1}"
    /// brand-yarn
    case brandYarn = "\u{FD79}"
    /// brand-yatse
    case brandYatse = "\u{F213}"
    /// brand-ycombinator
    case brandYcombinator = "\u{EDD9}"
    /// brand-youtube
    case brandYoutube = "\u{EC90}"
    /// brand-youtube-kids
    case brandYoutubeKids = "\u{F214}"
    /// brand-zalando
    case brandZalando = "\u{F49E}"
    /// brand-zapier
    case brandZapier = "\u{F49F}"
    /// brand-zeit
    case brandZeit = "\u{F335}"
    /// brand-zhihu
    case brandZhihu = "\u{F60A}"
    /// brand-zoom
    case brandZoom = "\u{F215}"
    /// brand-zulip
    case brandZulip = "\u{F4DE}"
    /// brand-zwift
    case brandZwift = "\u{F216}"
    /// bread
    case bread = "\u{EFA3}"
    /// bread-off
    case breadOff = "\u{F3CB}"
    /// briefcase
    case briefcase = "\u{EA46}"
    /// briefcase-2
    case briefcase2 = "\u{FB03}"
    /// briefcase-off
    case briefcaseOff = "\u{F3CC}"
    /// brightness
    case brightness = "\u{EB7F}"
    /// brightness-2
    case brightness2 = "\u{EE19}"
    /// brightness-auto
    case brightnessAuto = "\u{FD99}"
    /// brightness-down
    case brightnessDown = "\u{EB7D}"
    /// brightness-half
    case brightnessHalf = "\u{EE1A}"
    /// brightness-off
    case brightnessOff = "\u{F3CD}"
    /// brightness-up
    case brightnessUp = "\u{EB7E}"
    /// broadcast
    case broadcast = "\u{F1E9}"
    /// broadcast-off
    case broadcastOff = "\u{F1E8}"
    /// browser
    case browser = "\u{EBB7}"
    /// browser-check
    case browserCheck = "\u{EFD6}"
    /// browser-maximize
    case browserMaximize = "\u{100B0}"
    /// browser-minus
    case browserMinus = "\u{100AF}"
    /// browser-off
    case browserOff = "\u{F0C1}"
    /// browser-plus
    case browserPlus = "\u{EFD7}"
    /// browser-share
    case browserShare = "\u{100AE}"
    /// browser-x
    case browserX = "\u{EFD8}"
    /// brush
    case brush = "\u{EBB8}"
    /// brush-off
    case brushOff = "\u{F0C2}"
    /// bubble
    case bubble = "\u{FEBA}"
    /// bubble-minus
    case bubbleMinus = "\u{FEBE}"
    /// bubble-plus
    case bubblePlus = "\u{FEBD}"
    /// bubble-tea
    case bubbleTea = "\u{FF51}"
    /// bubble-tea-2
    case bubbleTea2 = "\u{FF52}"
    /// bubble-text
    case bubbleText = "\u{FEBC}"
    /// bubble-x
    case bubbleX = "\u{FEBB}"
    /// bucket
    case bucket = "\u{EA47}"
    /// bucket-droplet
    case bucketDroplet = "\u{F56A}"
    /// bucket-off
    case bucketOff = "\u{F103}"
    /// bug
    case bug = "\u{EA48}"
    /// bug-off
    case bugOff = "\u{F0C3}"
    /// building
    case building = "\u{EA4F}"
    /// building-airport
    case buildingAirport = "\u{FFA9}"
    /// building-arch
    case buildingArch = "\u{EA49}"
    /// building-bank
    case buildingBank = "\u{EBE2}"
    /// building-bridge
    case buildingBridge = "\u{EA4B}"
    /// building-bridge-2
    case buildingBridge2 = "\u{EA4A}"
    /// building-broadcast-tower
    case buildingBroadcastTower = "\u{F4BE}"
    /// building-burj-al-arab
    case buildingBurjAlArab = "\u{FF50}"
    /// building-carousel
    case buildingCarousel = "\u{ED87}"
    /// building-castle
    case buildingCastle = "\u{ED88}"
    /// building-church
    case buildingChurch = "\u{EA4C}"
    /// building-circus
    case buildingCircus = "\u{F4BF}"
    /// building-cog
    case buildingCog = "\u{10062}"
    /// building-community
    case buildingCommunity = "\u{EBF6}"
    /// building-cottage
    case buildingCottage = "\u{EE1B}"
    /// building-estate
    case buildingEstate = "\u{F5A5}"
    /// building-factory
    case buildingFactory = "\u{EE1C}"
    /// building-factory-2
    case buildingFactory2 = "\u{F082}"
    /// building-fortress
    case buildingFortress = "\u{ED89}"
    /// building-hospital
    case buildingHospital = "\u{EA4D}"
    /// building-lighthouse
    case buildingLighthouse = "\u{ED8A}"
    /// building-minus
    case buildingMinus = "\u{10061}"
    /// building-monument
    case buildingMonument = "\u{ED26}"
    /// building-mosque
    case buildingMosque = "\u{FA57}"
    /// building-off
    case buildingOff = "\u{FEFD}"
    /// building-pavilion
    case buildingPavilion = "\u{EBF7}"
    /// building-plus
    case buildingPlus = "\u{10060}"
    /// building-skyscraper
    case buildingSkyscraper = "\u{EC39}"
    /// building-stadium
    case buildingStadium = "\u{F641}"
    /// building-store
    case buildingStore = "\u{EA4E}"
    /// building-tunnel
    case buildingTunnel = "\u{F5A6}"
    /// building-warehouse
    case buildingWarehouse = "\u{EBE3}"
    /// building-wind-turbine
    case buildingWindTurbine = "\u{F4C0}"
    /// buildings
    case buildings = "\u{FF40}"
    /// bulb
    case bulb = "\u{EA51}"
    /// bulb-off
    case bulbOff = "\u{EA50}"
    /// bulldozer
    case bulldozer = "\u{EE1D}"
    /// burger
    case burger = "\u{FCB4}"
    /// bus
    case bus = "\u{EBE4}"
    /// bus-off
    case busOff = "\u{F3CE}"
    /// bus-stop
    case busStop = "\u{F2D4}"
    /// businessplan
    case businessplan = "\u{EE1E}"
    /// butterfly
    case butterfly = "\u{EFD9}"
    /// cactus
    case cactus = "\u{F21B}"
    /// cactus-off
    case cactusOff = "\u{F3CF}"
    /// cake
    case cake = "\u{F00F}"
    /// cake-off
    case cakeOff = "\u{F104}"
    /// cake-roll
    case cakeRoll = "\u{100BD}"
    /// calculator
    case calculator = "\u{EB80}"
    /// calculator-off
    case calculatorOff = "\u{F0C4}"
    /// calendar
    case calendar = "\u{EA53}"
    /// calendar-bolt
    case calendarBolt = "\u{F822}"
    /// calendar-cancel
    case calendarCancel = "\u{F823}"
    /// calendar-check
    case calendarCheck = "\u{F824}"
    /// calendar-clock
    case calendarClock = "\u{FD2E}"
    /// calendar-code
    case calendarCode = "\u{F825}"
    /// calendar-cog
    case calendarCog = "\u{F826}"
    /// calendar-dollar
    case calendarDollar = "\u{F827}"
    /// calendar-dot
    case calendarDot = "\u{FD3E}"
    /// calendar-down
    case calendarDown = "\u{F828}"
    /// calendar-due
    case calendarDue = "\u{F621}"
    /// calendar-event
    case calendarEvent = "\u{EA52}"
    /// calendar-exclamation
    case calendarExclamation = "\u{F829}"
    /// calendar-heart
    case calendarHeart = "\u{F82A}"
    /// calendar-minus
    case calendarMinus = "\u{EBB9}"
    /// calendar-month
    case calendarMonth = "\u{FD2F}"
    /// calendar-off
    case calendarOff = "\u{EE1F}"
    /// calendar-pause
    case calendarPause = "\u{F82B}"
    /// calendar-pin
    case calendarPin = "\u{F82C}"
    /// calendar-plus
    case calendarPlus = "\u{EBBA}"
    /// calendar-question
    case calendarQuestion = "\u{F82D}"
    /// calendar-repeat
    case calendarRepeat = "\u{FAD2}"
    /// calendar-sad
    case calendarSad = "\u{FD1D}"
    /// calendar-search
    case calendarSearch = "\u{F82E}"
    /// calendar-share
    case calendarShare = "\u{F82F}"
    /// calendar-smile
    case calendarSmile = "\u{FD1E}"
    /// calendar-star
    case calendarStar = "\u{F830}"
    /// calendar-stats
    case calendarStats = "\u{EE20}"
    /// calendar-time
    case calendarTime = "\u{EE21}"
    /// calendar-up
    case calendarUp = "\u{F831}"
    /// calendar-user
    case calendarUser = "\u{FD1F}"
    /// calendar-week
    case calendarWeek = "\u{FD30}"
    /// calendar-x
    case calendarX = "\u{F832}"
    /// camera
    case camera = "\u{EA54}"
    /// camera-ai
    case cameraAi = "\u{FFA8}"
    /// camera-bitcoin
    case cameraBitcoin = "\u{FFA7}"
    /// camera-bolt
    case cameraBolt = "\u{F833}"
    /// camera-cancel
    case cameraCancel = "\u{F834}"
    /// camera-check
    case cameraCheck = "\u{F835}"
    /// camera-code
    case cameraCode = "\u{F836}"
    /// camera-cog
    case cameraCog = "\u{F837}"
    /// camera-dollar
    case cameraDollar = "\u{F838}"
    /// camera-down
    case cameraDown = "\u{F839}"
    /// camera-exclamation
    case cameraExclamation = "\u{F83A}"
    /// camera-heart
    case cameraHeart = "\u{F83B}"
    /// camera-minus
    case cameraMinus = "\u{EC3A}"
    /// camera-moon
    case cameraMoon = "\u{FFA6}"
    /// camera-off
    case cameraOff = "\u{ECEE}"
    /// camera-pause
    case cameraPause = "\u{F83C}"
    /// camera-pin
    case cameraPin = "\u{F83D}"
    /// camera-plus
    case cameraPlus = "\u{EC3B}"
    /// camera-question
    case cameraQuestion = "\u{F83E}"
    /// camera-rotate
    case cameraRotate = "\u{EE22}"
    /// camera-search
    case cameraSearch = "\u{F83F}"
    /// camera-selfie
    case cameraSelfie = "\u{EE23}"
    /// camera-share
    case cameraShare = "\u{F840}"
    /// camera-spark
    case cameraSpark = "\u{FFBC}"
    /// camera-star
    case cameraStar = "\u{F841}"
    /// camera-up
    case cameraUp = "\u{F842}"
    /// camera-x
    case cameraX = "\u{F843}"
    /// camper
    case camper = "\u{FA25}"
    /// campfire
    case campfire = "\u{F5A7}"
    /// cancel
    case cancel = "\u{FF11}"
    /// candle
    case candle = "\u{EFC6}"
    /// candy
    case candy = "\u{EF0D}"
    /// candy-off
    case candyOff = "\u{F0C5}"
    /// cane
    case cane = "\u{F50F}"
    /// cannabis
    case cannabis = "\u{F4C1}"
    /// cap-projecting
    case capProjecting = "\u{FF22}"
    /// cap-rounded
    case capRounded = "\u{FF21}"
    /// cap-straight
    case capStraight = "\u{FF20}"
    /// capsule
    case capsule = "\u{FAE3}"
    /// capsule-horizontal
    case capsuleHorizontal = "\u{FAE2}"
    /// capture
    case capture = "\u{EC3C}"
    /// capture-off
    case captureOff = "\u{F0C6}"
    /// car
    case car = "\u{EBBB}"
    /// car-4wd
    case car4wd = "\u{FDB8}"
    /// car-crane
    case carCrane = "\u{EF25}"
    /// car-crash
    case carCrash = "\u{EFA4}"
    /// car-fan
    case carFan = "\u{FDB3}"
    /// car-fan-1
    case carFan1 = "\u{FDB7}"
    /// car-fan-2
    case carFan2 = "\u{FDB6}"
    /// car-fan-3
    case carFan3 = "\u{FDB5}"
    /// car-fan-auto
    case carFanAuto = "\u{FDB4}"
    /// car-garage
    case carGarage = "\u{FC77}"
    /// car-off
    case carOff = "\u{F0C7}"
    /// car-suv
    case carSuv = "\u{FC8B}"
    /// car-turbine
    case carTurbine = "\u{F4FD}"
    /// carambola
    case carambola = "\u{FEB9}"
    /// caravan
    case caravan = "\u{EC7C}"
    /// cardboards
    case cardboards = "\u{ED74}"
    /// cardboards-off
    case cardboardsOff = "\u{F0C8}"
    /// cards
    case cards = "\u{F510}"
    /// caret-down
    case caretDown = "\u{EB5D}"
    /// caret-left
    case caretLeft = "\u{EB5E}"
    /// caret-left-right
    case caretLeftRight = "\u{FC43}"
    /// caret-right
    case caretRight = "\u{EB5F}"
    /// caret-up
    case caretUp = "\u{EB60}"
    /// caret-up-down
    case caretUpDown = "\u{FC44}"
    /// carousel-horizontal
    case carouselHorizontal = "\u{F659}"
    /// carousel-vertical
    case carouselVertical = "\u{F65A}"
    /// carrot
    case carrot = "\u{F21C}"
    /// carrot-off
    case carrotOff = "\u{F3D0}"
    /// cash
    case cash = "\u{EA55}"
    /// cash-banknote
    case cashBanknote = "\u{EE25}"
    /// cash-banknote-edit
    case cashBanknoteEdit = "\u{10149}"
    /// cash-banknote-heart
    case cashBanknoteHeart = "\u{10148}"
    /// cash-banknote-minus
    case cashBanknoteMinus = "\u{10147}"
    /// cash-banknote-move
    case cashBanknoteMove = "\u{10145}"
    /// cash-banknote-move-back
    case cashBanknoteMoveBack = "\u{10146}"
    /// cash-banknote-off
    case cashBanknoteOff = "\u{EE24}"
    /// cash-banknote-plus
    case cashBanknotePlus = "\u{10144}"
    /// cash-edit
    case cashEdit = "\u{10143}"
    /// cash-heart
    case cashHeart = "\u{10142}"
    /// cash-minus
    case cashMinus = "\u{10141}"
    /// cash-move
    case cashMove = "\u{1013F}"
    /// cash-move-back
    case cashMoveBack = "\u{10140}"
    /// cash-off
    case cashOff = "\u{F105}"
    /// cash-plus
    case cashPlus = "\u{1013E}"
    /// cash-register
    case cashRegister = "\u{FEE6}"
    /// cast
    case cast = "\u{EA56}"
    /// cast-off
    case castOff = "\u{F0C9}"
    /// cat
    case cat = "\u{F65B}"
    /// category
    case category = "\u{F1F6}"
    /// category-2
    case category2 = "\u{F1F5}"
    /// category-minus
    case categoryMinus = "\u{FD20}"
    /// category-plus
    case categoryPlus = "\u{FD21}"
    /// ce
    case ce = "\u{ED75}"
    /// ce-off
    case ceOff = "\u{F0CA}"
    /// cell
    case cell = "\u{F05F}"
    /// cell-signal-1
    case cellSignal1 = "\u{F083}"
    /// cell-signal-2
    case cellSignal2 = "\u{F084}"
    /// cell-signal-3
    case cellSignal3 = "\u{F085}"
    /// cell-signal-4
    case cellSignal4 = "\u{F086}"
    /// cell-signal-5
    case cellSignal5 = "\u{F087}"
    /// cell-signal-off
    case cellSignalOff = "\u{F088}"
    /// certificate
    case certificate = "\u{ED76}"
    /// certificate-2
    case certificate2 = "\u{F073}"
    /// certificate-2-off
    case certificate2Off = "\u{F0CB}"
    /// certificate-off
    case certificateOff = "\u{F0CC}"
    /// chair-director
    case chairDirector = "\u{F2D5}"
    /// chalkboard
    case chalkboard = "\u{F34D}"
    /// chalkboard-off
    case chalkboardOff = "\u{F3D1}"
    /// chalkboard-teacher
    case chalkboardTeacher = "\u{10160}"
    /// charging-pile
    case chargingPile = "\u{EE26}"
    /// chart-arcs
    case chartArcs = "\u{EE28}"
    /// chart-arcs-3
    case chartArcs3 = "\u{EE27}"
    /// chart-area
    case chartArea = "\u{EA58}"
    /// chart-area-line
    case chartAreaLine = "\u{EA57}"
    /// chart-arrows
    case chartArrows = "\u{EE2A}"
    /// chart-arrows-vertical
    case chartArrowsVertical = "\u{EE29}"
    /// chart-bar
    case chartBar = "\u{EA59}"
    /// chart-bar-off
    case chartBarOff = "\u{F3D2}"
    /// chart-bar-popular
    case chartBarPopular = "\u{FEF7}"
    /// chart-bubble
    case chartBubble = "\u{EC75}"
    /// chart-candle
    case chartCandle = "\u{EA5A}"
    /// chart-circles
    case chartCircles = "\u{EE2B}"
    /// chart-cohort
    case chartCohort = "\u{FEF6}"
    /// chart-column
    case chartColumn = "\u{FFA5}"
    /// chart-covariate
    case chartCovariate = "\u{FFA4}"
    /// chart-donut
    case chartDonut = "\u{EA5B}"
    /// chart-donut-2
    case chartDonut2 = "\u{EE2C}"
    /// chart-donut-3
    case chartDonut3 = "\u{EE2D}"
    /// chart-donut-4
    case chartDonut4 = "\u{EE2E}"
    /// chart-dots
    case chartDots = "\u{EE2F}"
    /// chart-dots-2
    case chartDots2 = "\u{F097}"
    /// chart-dots-3
    case chartDots3 = "\u{F098}"
    /// chart-funnel
    case chartFunnel = "\u{FEF5}"
    /// chart-grid-dots
    case chartGridDots = "\u{F4C2}"
    /// chart-histogram
    case chartHistogram = "\u{F65C}"
    /// chart-infographic
    case chartInfographic = "\u{EE30}"
    /// chart-line
    case chartLine = "\u{EA5C}"
    /// chart-pie
    case chartPie = "\u{EA5D}"
    /// chart-pie-2
    case chartPie2 = "\u{EE31}"
    /// chart-pie-3
    case chartPie3 = "\u{EE32}"
    /// chart-pie-4
    case chartPie4 = "\u{EE33}"
    /// chart-pie-off
    case chartPieOff = "\u{F3D3}"
    /// chart-ppf
    case chartPpf = "\u{F618}"
    /// chart-radar
    case chartRadar = "\u{ED77}"
    /// chart-sankey
    case chartSankey = "\u{F619}"
    /// chart-scatter
    case chartScatter = "\u{FD93}"
    /// chart-scatter-3d
    case chartScatter3d = "\u{FD92}"
    /// chart-treemap
    case chartTreemap = "\u{F381}"
    /// check
    case check = "\u{EA5E}"
    /// checkbox
    case checkbox = "\u{EBA6}"
    /// checklist
    case checklist = "\u{F074}"
    /// checks
    case checks = "\u{EBAA}"
    /// checkup-list
    case checkupList = "\u{EF5A}"
    /// cheese
    case cheese = "\u{EF26}"
    /// chef-hat
    case chefHat = "\u{F21D}"
    /// chef-hat-off
    case chefHatOff = "\u{F3D4}"
    /// cherry
    case cherry = "\u{F511}"
    /// chess
    case chess = "\u{F382}"
    /// chess-bishop
    case chessBishop = "\u{F56B}"
    /// chess-king
    case chessKing = "\u{F56C}"
    /// chess-knight
    case chessKnight = "\u{F56D}"
    /// chess-queen
    case chessQueen = "\u{F56E}"
    /// chess-rook
    case chessRook = "\u{F56F}"
    /// chevron-compact-down
    case chevronCompactDown = "\u{FAF0}"
    /// chevron-compact-left
    case chevronCompactLeft = "\u{FAF1}"
    /// chevron-compact-right
    case chevronCompactRight = "\u{FAF2}"
    /// chevron-compact-up
    case chevronCompactUp = "\u{FAF3}"
    /// chevron-down
    case chevronDown = "\u{EA5F}"
    /// chevron-down-left
    case chevronDownLeft = "\u{ED09}"
    /// chevron-down-right
    case chevronDownRight = "\u{ED0A}"
    /// chevron-left
    case chevronLeft = "\u{EA60}"
    /// chevron-left-pipe
    case chevronLeftPipe = "\u{FAE4}"
    /// chevron-right
    case chevronRight = "\u{EA61}"
    /// chevron-right-pipe
    case chevronRightPipe = "\u{FAE5}"
    /// chevron-up
    case chevronUp = "\u{EA62}"
    /// chevron-up-left
    case chevronUpLeft = "\u{ED0B}"
    /// chevron-up-right
    case chevronUpRight = "\u{ED0C}"
    /// chevrons-down
    case chevronsDown = "\u{EA63}"
    /// chevrons-down-left
    case chevronsDownLeft = "\u{ED0D}"
    /// chevrons-down-right
    case chevronsDownRight = "\u{ED0E}"
    /// chevrons-left
    case chevronsLeft = "\u{EA64}"
    /// chevrons-right
    case chevronsRight = "\u{EA65}"
    /// chevrons-up
    case chevronsUp = "\u{EA66}"
    /// chevrons-up-left
    case chevronsUpLeft = "\u{ED0F}"
    /// chevrons-up-right
    case chevronsUpRight = "\u{ED10}"
    /// chisel
    case chisel = "\u{F383}"
    /// christmas-ball
    case christmasBall = "\u{FD31}"
    /// christmas-tree
    case christmasTree = "\u{ED78}"
    /// christmas-tree-off
    case christmasTreeOff = "\u{F3D5}"
    /// circle
    case circle = "\u{EA6B}"
    /// circle-arrow-down
    case circleArrowDown = "\u{F6F9}"
    /// circle-arrow-down-left
    case circleArrowDownLeft = "\u{F6F6}"
    /// circle-arrow-down-right
    case circleArrowDownRight = "\u{F6F8}"
    /// circle-arrow-left
    case circleArrowLeft = "\u{F6FB}"
    /// circle-arrow-right
    case circleArrowRight = "\u{F6FD}"
    /// circle-arrow-up
    case circleArrowUp = "\u{F703}"
    /// circle-arrow-up-left
    case circleArrowUpLeft = "\u{F700}"
    /// circle-arrow-up-right
    case circleArrowUpRight = "\u{F702}"
    /// circle-asterisk
    case circleAsterisk = "\u{101AD}"
    /// circle-caret-down
    case circleCaretDown = "\u{F4A9}"
    /// circle-caret-left
    case circleCaretLeft = "\u{F4AA}"
    /// circle-caret-right
    case circleCaretRight = "\u{F4AB}"
    /// circle-caret-up
    case circleCaretUp = "\u{F4AC}"
    /// circle-check
    case circleCheck = "\u{EA67}"
    /// circle-chevron-down
    case circleChevronDown = "\u{F622}"
    /// circle-chevron-left
    case circleChevronLeft = "\u{F623}"
    /// circle-chevron-right
    case circleChevronRight = "\u{F624}"
    /// circle-chevron-up
    case circleChevronUp = "\u{F625}"
    /// circle-chevrons-down
    case circleChevronsDown = "\u{F642}"
    /// circle-chevrons-left
    case circleChevronsLeft = "\u{F643}"
    /// circle-chevrons-right
    case circleChevronsRight = "\u{F644}"
    /// circle-chevrons-up
    case circleChevronsUp = "\u{F645}"
    /// circle-dashed
    case circleDashed = "\u{ED27}"
    /// circle-dashed-check
    case circleDashedCheck = "\u{FEB8}"
    /// circle-dashed-letter-a
    case circleDashedLetterA = "\u{FF9A}"
    /// circle-dashed-letter-b
    case circleDashedLetterB = "\u{FF99}"
    /// circle-dashed-letter-c
    case circleDashedLetterC = "\u{FF98}"
    /// circle-dashed-letter-d
    case circleDashedLetterD = "\u{FF97}"
    /// circle-dashed-letter-e
    case circleDashedLetterE = "\u{FF96}"
    /// circle-dashed-letter-f
    case circleDashedLetterF = "\u{FF95}"
    /// circle-dashed-letter-g
    case circleDashedLetterG = "\u{FF94}"
    /// circle-dashed-letter-h
    case circleDashedLetterH = "\u{FF93}"
    /// circle-dashed-letter-i
    case circleDashedLetterI = "\u{FF92}"
    /// circle-dashed-letter-j
    case circleDashedLetterJ = "\u{FF91}"
    /// circle-dashed-letter-k
    case circleDashedLetterK = "\u{FF90}"
    /// circle-dashed-letter-l
    case circleDashedLetterL = "\u{FF8F}"
    /// circle-dashed-letter-m
    case circleDashedLetterM = "\u{FF8D}"
    /// circle-dashed-letter-n
    case circleDashedLetterN = "\u{FF8C}"
    /// circle-dashed-letter-o
    case circleDashedLetterO = "\u{FF8B}"
    /// circle-dashed-letter-p
    case circleDashedLetterP = "\u{FF8A}"
    /// circle-dashed-letter-q
    case circleDashedLetterQ = "\u{FF89}"
    /// circle-dashed-letter-r
    case circleDashedLetterR = "\u{FF88}"
    /// circle-dashed-letter-s
    case circleDashedLetterS = "\u{FF87}"
    /// circle-dashed-letter-t
    case circleDashedLetterT = "\u{FF86}"
    /// circle-dashed-letter-u
    case circleDashedLetterU = "\u{FF85}"
    /// circle-dashed-letter-v
    case circleDashedLetterV = "\u{FF84}"
    /// circle-dashed-letter-w
    case circleDashedLetterW = "\u{FF83}"
    /// circle-dashed-letter-x
    case circleDashedLetterX = "\u{FF82}"
    /// circle-dashed-letter-y
    case circleDashedLetterY = "\u{FF81}"
    /// circle-dashed-letter-z
    case circleDashedLetterZ = "\u{FF80}"
    /// circle-dashed-minus
    case circleDashedMinus = "\u{FEB7}"
    /// circle-dashed-number-0
    case circleDashedNumber0 = "\u{FC6B}"
    /// circle-dashed-number-1
    case circleDashedNumber1 = "\u{FC6C}"
    /// circle-dashed-number-2
    case circleDashedNumber2 = "\u{FC6D}"
    /// circle-dashed-number-3
    case circleDashedNumber3 = "\u{FC6E}"
    /// circle-dashed-number-4
    case circleDashedNumber4 = "\u{FC6F}"
    /// circle-dashed-number-5
    case circleDashedNumber5 = "\u{FC70}"
    /// circle-dashed-number-6
    case circleDashedNumber6 = "\u{FC71}"
    /// circle-dashed-number-7
    case circleDashedNumber7 = "\u{FC72}"
    /// circle-dashed-number-8
    case circleDashedNumber8 = "\u{FC73}"
    /// circle-dashed-number-9
    case circleDashedNumber9 = "\u{FC74}"
    /// circle-dashed-percentage
    case circleDashedPercentage = "\u{FD7A}"
    /// circle-dashed-plus
    case circleDashedPlus = "\u{FEB6}"
    /// circle-dashed-x
    case circleDashedX = "\u{FC75}"
    /// circle-dot
    case circleDot = "\u{EFB1}"
    /// circle-dotted
    case circleDotted = "\u{ED28}"
    /// circle-dotted-letter-a
    case circleDottedLetterA = "\u{FF7F}"
    /// circle-dotted-letter-b
    case circleDottedLetterB = "\u{FF7E}"
    /// circle-dotted-letter-c
    case circleDottedLetterC = "\u{FF7D}"
    /// circle-dotted-letter-d
    case circleDottedLetterD = "\u{FF7C}"
    /// circle-dotted-letter-e
    case circleDottedLetterE = "\u{FF7B}"
    /// circle-dotted-letter-f
    case circleDottedLetterF = "\u{FF7A}"
    /// circle-dotted-letter-g
    case circleDottedLetterG = "\u{FF79}"
    /// circle-dotted-letter-h
    case circleDottedLetterH = "\u{FF78}"
    /// circle-dotted-letter-i
    case circleDottedLetterI = "\u{FF77}"
    /// circle-dotted-letter-j
    case circleDottedLetterJ = "\u{FF76}"
    /// circle-dotted-letter-k
    case circleDottedLetterK = "\u{FF75}"
    /// circle-dotted-letter-l
    case circleDottedLetterL = "\u{FF74}"
    /// circle-dotted-letter-m
    case circleDottedLetterM = "\u{FF73}"
    /// circle-dotted-letter-n
    case circleDottedLetterN = "\u{FF72}"
    /// circle-dotted-letter-o
    case circleDottedLetterO = "\u{FF71}"
    /// circle-dotted-letter-p
    case circleDottedLetterP = "\u{FF70}"
    /// circle-dotted-letter-q
    case circleDottedLetterQ = "\u{FF6F}"
    /// circle-dotted-letter-r
    case circleDottedLetterR = "\u{FF6E}"
    /// circle-dotted-letter-s
    case circleDottedLetterS = "\u{FF6D}"
    /// circle-dotted-letter-t
    case circleDottedLetterT = "\u{FF6C}"
    /// circle-dotted-letter-u
    case circleDottedLetterU = "\u{FF6B}"
    /// circle-dotted-letter-v
    case circleDottedLetterV = "\u{FF6A}"
    /// circle-dotted-letter-w
    case circleDottedLetterW = "\u{FF69}"
    /// circle-dotted-letter-x
    case circleDottedLetterX = "\u{FF68}"
    /// circle-dotted-letter-y
    case circleDottedLetterY = "\u{FF67}"
    /// circle-dotted-letter-z
    case circleDottedLetterZ = "\u{FF66}"
    /// circle-half
    case circleHalf = "\u{EE3F}"
    /// circle-half-2
    case circleHalf2 = "\u{EFF3}"
    /// circle-half-vertical
    case circleHalfVertical = "\u{EE3E}"
    /// circle-key
    case circleKey = "\u{F633}"
    /// circle-letter-a
    case circleLetterA = "\u{F441}"
    /// circle-letter-b
    case circleLetterB = "\u{F442}"
    /// circle-letter-c
    case circleLetterC = "\u{F443}"
    /// circle-letter-d
    case circleLetterD = "\u{F444}"
    /// circle-letter-e
    case circleLetterE = "\u{F445}"
    /// circle-letter-f
    case circleLetterF = "\u{F446}"
    /// circle-letter-g
    case circleLetterG = "\u{F447}"
    /// circle-letter-h
    case circleLetterH = "\u{F448}"
    /// circle-letter-i
    case circleLetterI = "\u{F449}"
    /// circle-letter-j
    case circleLetterJ = "\u{F44A}"
    /// circle-letter-k
    case circleLetterK = "\u{F44B}"
    /// circle-letter-l
    case circleLetterL = "\u{F44C}"
    /// circle-letter-m
    case circleLetterM = "\u{F44D}"
    /// circle-letter-n
    case circleLetterN = "\u{F44E}"
    /// circle-letter-o
    case circleLetterO = "\u{F44F}"
    /// circle-letter-p
    case circleLetterP = "\u{F450}"
    /// circle-letter-q
    case circleLetterQ = "\u{F451}"
    /// circle-letter-r
    case circleLetterR = "\u{F452}"
    /// circle-letter-s
    case circleLetterS = "\u{F453}"
    /// circle-letter-t
    case circleLetterT = "\u{F454}"
    /// circle-letter-u
    case circleLetterU = "\u{F455}"
    /// circle-letter-v
    case circleLetterV = "\u{F4AD}"
    /// circle-letter-w
    case circleLetterW = "\u{F456}"
    /// circle-letter-x
    case circleLetterX = "\u{F4AE}"
    /// circle-letter-y
    case circleLetterY = "\u{F457}"
    /// circle-letter-z
    case circleLetterZ = "\u{F458}"
    /// circle-minus
    case circleMinus = "\u{EA68}"
    /// circle-minus-2
    case circleMinus2 = "\u{FC8C}"
    /// circle-number-0
    case circleNumber0 = "\u{EE34}"
    /// circle-number-1
    case circleNumber1 = "\u{EE35}"
    /// circle-number-2
    case circleNumber2 = "\u{EE36}"
    /// circle-number-3
    case circleNumber3 = "\u{EE37}"
    /// circle-number-4
    case circleNumber4 = "\u{EE38}"
    /// circle-number-5
    case circleNumber5 = "\u{EE39}"
    /// circle-number-6
    case circleNumber6 = "\u{EE3A}"
    /// circle-number-7
    case circleNumber7 = "\u{EE3B}"
    /// circle-number-8
    case circleNumber8 = "\u{EE3C}"
    /// circle-number-9
    case circleNumber9 = "\u{EE3D}"
    /// circle-off
    case circleOff = "\u{EE40}"
    /// circle-percentage
    case circlePercentage = "\u{FD7B}"
    /// circle-plus
    case circlePlus = "\u{EA69}"
    /// circle-plus-2
    case circlePlus2 = "\u{FC8D}"
    /// circle-rectangle
    case circleRectangle = "\u{F010}"
    /// circle-rectangle-off
    case circleRectangleOff = "\u{F0CD}"
    /// circle-square
    case circleSquare = "\u{ECE4}"
    /// circle-triangle
    case circleTriangle = "\u{F011}"
    /// circle-x
    case circleX = "\u{EA6A}"
    /// circles
    case circles = "\u{ECE5}"
    /// circles-relation
    case circlesRelation = "\u{F4C3}"
    /// circuit-ammeter
    case circuitAmmeter = "\u{F271}"
    /// circuit-battery
    case circuitBattery = "\u{F272}"
    /// circuit-bulb
    case circuitBulb = "\u{F273}"
    /// circuit-capacitor
    case circuitCapacitor = "\u{F275}"
    /// circuit-capacitor-polarized
    case circuitCapacitorPolarized = "\u{F274}"
    /// circuit-cell
    case circuitCell = "\u{F277}"
    /// circuit-cell-plus
    case circuitCellPlus = "\u{F276}"
    /// circuit-changeover
    case circuitChangeover = "\u{F278}"
    /// circuit-diode
    case circuitDiode = "\u{F27A}"
    /// circuit-diode-zener
    case circuitDiodeZener = "\u{F279}"
    /// circuit-ground
    case circuitGround = "\u{F27C}"
    /// circuit-ground-digital
    case circuitGroundDigital = "\u{F27B}"
    /// circuit-inductor
    case circuitInductor = "\u{F27D}"
    /// circuit-motor
    case circuitMotor = "\u{F27E}"
    /// circuit-pushbutton
    case circuitPushbutton = "\u{F27F}"
    /// circuit-resistor
    case circuitResistor = "\u{F280}"
    /// circuit-switch-closed
    case circuitSwitchClosed = "\u{F281}"
    /// circuit-switch-open
    case circuitSwitchOpen = "\u{F282}"
    /// circuit-voltmeter
    case circuitVoltmeter = "\u{F283}"
    /// clear-all
    case clearAll = "\u{EE41}"
    /// clear-formatting
    case clearFormatting = "\u{EBE5}"
    /// click
    case click = "\u{EBBC}"
    /// cliff-jumping
    case cliffJumping = "\u{FEFC}"
    /// clipboard
    case clipboard = "\u{EA6F}"
    /// clipboard-check
    case clipboardCheck = "\u{EA6C}"
    /// clipboard-copy
    case clipboardCopy = "\u{F299}"
    /// clipboard-data
    case clipboardData = "\u{F563}"
    /// clipboard-heart
    case clipboardHeart = "\u{F34E}"
    /// clipboard-list
    case clipboardList = "\u{EA6D}"
    /// clipboard-off
    case clipboardOff = "\u{F0CE}"
    /// clipboard-plus
    case clipboardPlus = "\u{EFB2}"
    /// clipboard-search
    case clipboardSearch = "\u{10098}"
    /// clipboard-smile
    case clipboardSmile = "\u{FD9A}"
    /// clipboard-text
    case clipboardText = "\u{F089}"
    /// clipboard-typography
    case clipboardTypography = "\u{F34F}"
    /// clipboard-x
    case clipboardX = "\u{EA6E}"
    /// clock
    case clock = "\u{EA70}"
    /// clock-12
    case clock12 = "\u{FC56}"
    /// clock-2
    case clock2 = "\u{F099}"
    /// clock-24
    case clock24 = "\u{FC57}"
    /// clock-bitcoin
    case clockBitcoin = "\u{FF3F}"
    /// clock-bolt
    case clockBolt = "\u{F844}"
    /// clock-cancel
    case clockCancel = "\u{F546}"
    /// clock-check
    case clockCheck = "\u{F7C1}"
    /// clock-code
    case clockCode = "\u{F845}"
    /// clock-cog
    case clockCog = "\u{F7C2}"
    /// clock-dollar
    case clockDollar = "\u{F846}"
    /// clock-down
    case clockDown = "\u{F7C3}"
    /// clock-edit
    case clockEdit = "\u{F547}"
    /// clock-exclamation
    case clockExclamation = "\u{F847}"
    /// clock-heart
    case clockHeart = "\u{F7C4}"
    /// clock-hour-1
    case clockHour1 = "\u{F313}"
    /// clock-hour-10
    case clockHour10 = "\u{F314}"
    /// clock-hour-11
    case clockHour11 = "\u{F315}"
    /// clock-hour-12
    case clockHour12 = "\u{F316}"
    /// clock-hour-2
    case clockHour2 = "\u{F317}"
    /// clock-hour-3
    case clockHour3 = "\u{F318}"
    /// clock-hour-4
    case clockHour4 = "\u{F319}"
    /// clock-hour-5
    case clockHour5 = "\u{F31A}"
    /// clock-hour-6
    case clockHour6 = "\u{F31B}"
    /// clock-hour-7
    case clockHour7 = "\u{F31C}"
    /// clock-hour-8
    case clockHour8 = "\u{F31D}"
    /// clock-hour-9
    case clockHour9 = "\u{F31E}"
    /// clock-minus
    case clockMinus = "\u{F848}"
    /// clock-off
    case clockOff = "\u{F0CF}"
    /// clock-pause
    case clockPause = "\u{F548}"
    /// clock-pin
    case clockPin = "\u{F849}"
    /// clock-play
    case clockPlay = "\u{F549}"
    /// clock-plus
    case clockPlus = "\u{F7C5}"
    /// clock-question
    case clockQuestion = "\u{F7C6}"
    /// clock-record
    case clockRecord = "\u{F54A}"
    /// clock-search
    case clockSearch = "\u{F7C7}"
    /// clock-share
    case clockShare = "\u{F84A}"
    /// clock-shield
    case clockShield = "\u{F7C8}"
    /// clock-star
    case clockStar = "\u{F7C9}"
    /// clock-stop
    case clockStop = "\u{F54B}"
    /// clock-up
    case clockUp = "\u{F7CA}"
    /// clock-x
    case clockX = "\u{F7CB}"
    /// clothes-rack
    case clothesRack = "\u{F285}"
    /// clothes-rack-off
    case clothesRackOff = "\u{F3D6}"
    /// cloud
    case cloud = "\u{EA76}"
    /// cloud-bitcoin
    case cloudBitcoin = "\u{FF3E}"
    /// cloud-bolt
    case cloudBolt = "\u{F84B}"
    /// cloud-cancel
    case cloudCancel = "\u{F84C}"
    /// cloud-check
    case cloudCheck = "\u{F84D}"
    /// cloud-code
    case cloudCode = "\u{F84E}"
    /// cloud-cog
    case cloudCog = "\u{F84F}"
    /// cloud-computing
    case cloudComputing = "\u{F1D0}"
    /// cloud-data-connection
    case cloudDataConnection = "\u{F1D1}"
    /// cloud-dollar
    case cloudDollar = "\u{F850}"
    /// cloud-down
    case cloudDown = "\u{F851}"
    /// cloud-download
    case cloudDownload = "\u{EA71}"
    /// cloud-exclamation
    case cloudExclamation = "\u{F852}"
    /// cloud-fog
    case cloudFog = "\u{ECD9}"
    /// cloud-heart
    case cloudHeart = "\u{F853}"
    /// cloud-lock
    case cloudLock = "\u{EFDB}"
    /// cloud-lock-open
    case cloudLockOpen = "\u{EFDA}"
    /// cloud-minus
    case cloudMinus = "\u{F854}"
    /// cloud-network
    case cloudNetwork = "\u{FC78}"
    /// cloud-off
    case cloudOff = "\u{ED3E}"
    /// cloud-pause
    case cloudPause = "\u{F855}"
    /// cloud-pin
    case cloudPin = "\u{F856}"
    /// cloud-plus
    case cloudPlus = "\u{F857}"
    /// cloud-question
    case cloudQuestion = "\u{F858}"
    /// cloud-rain
    case cloudRain = "\u{EA72}"
    /// cloud-search
    case cloudSearch = "\u{F859}"
    /// cloud-share
    case cloudShare = "\u{F85A}"
    /// cloud-snow
    case cloudSnow = "\u{EA73}"
    /// cloud-star
    case cloudStar = "\u{F85B}"
    /// cloud-storm
    case cloudStorm = "\u{EA74}"
    /// cloud-up
    case cloudUp = "\u{F85C}"
    /// cloud-upload
    case cloudUpload = "\u{EA75}"
    /// cloud-x
    case cloudX = "\u{F85D}"
    /// clover
    case clover = "\u{F1EA}"
    /// clover-2
    case clover2 = "\u{F21E}"
    /// clubs
    case clubs = "\u{EFF4}"
    /// code
    case code = "\u{EA77}"
    /// code-asterisk
    case codeAsterisk = "\u{F312}"
    /// code-circle
    case codeCircle = "\u{F4FF}"
    /// code-circle-2
    case codeCircle2 = "\u{F4FE}"
    /// code-dots
    case codeDots = "\u{F61A}"
    /// code-minus
    case codeMinus = "\u{EE42}"
    /// code-off
    case codeOff = "\u{F0D0}"
    /// code-plus
    case codePlus = "\u{EE43}"
    /// code-variable
    case codeVariable = "\u{100AB}"
    /// code-variable-minus
    case codeVariableMinus = "\u{100AD}"
    /// code-variable-plus
    case codeVariablePlus = "\u{100AC}"
    /// coffee
    case coffee = "\u{EF0E}"
    /// coffee-off
    case coffeeOff = "\u{F106}"
    /// coffin
    case coffin = "\u{F579}"
    /// coin
    case coin = "\u{EB82}"
    /// coin-bitcoin
    case coinBitcoin = "\u{F2BE}"
    /// coin-euro
    case coinEuro = "\u{F2BF}"
    /// coin-monero
    case coinMonero = "\u{F4A0}"
    /// coin-off
    case coinOff = "\u{F0D1}"
    /// coin-pound
    case coinPound = "\u{F2C0}"
    /// coin-rupee
    case coinRupee = "\u{F2C1}"
    /// coin-taka
    case coinTaka = "\u{FD0D}"
    /// coin-yen
    case coinYen = "\u{F2C2}"
    /// coin-yuan
    case coinYuan = "\u{F2C3}"
    /// coins
    case coins = "\u{F65D}"
    /// color-filter
    case colorFilter = "\u{F5A8}"
    /// color-picker
    case colorPicker = "\u{EBE6}"
    /// color-picker-off
    case colorPickerOff = "\u{F0D2}"
    /// color-swatch
    case colorSwatch = "\u{EB61}"
    /// color-swatch-off
    case colorSwatchOff = "\u{F0D3}"
    /// column-insert-left
    case columnInsertLeft = "\u{EE44}"
    /// column-insert-right
    case columnInsertRight = "\u{EE45}"
    /// column-remove
    case columnRemove = "\u{FAF4}"
    /// columns
    case columns = "\u{EB83}"
    /// columns-1
    case columns1 = "\u{F6D4}"
    /// columns-2
    case columns2 = "\u{F6D5}"
    /// columns-3
    case columns3 = "\u{F6D6}"
    /// columns-off
    case columnsOff = "\u{F0D4}"
    /// comet
    case comet = "\u{EC76}"
    /// command
    case command = "\u{EA78}"
    /// command-off
    case commandOff = "\u{F3D7}"
    /// compass
    case compass = "\u{EA79}"
    /// compass-off
    case compassOff = "\u{F0D5}"
    /// components
    case components = "\u{EFA5}"
    /// components-off
    case componentsOff = "\u{F0D6}"
    /// cone
    case cone = "\u{EFDD}"
    /// cone-2
    case cone2 = "\u{EFDC}"
    /// cone-off
    case coneOff = "\u{F3D8}"
    /// cone-plus
    case conePlus = "\u{FA94}"
    /// confetti
    case confetti = "\u{EE46}"
    /// confetti-off
    case confettiOff = "\u{F3D9}"
    /// confucius
    case confucius = "\u{F58A}"
    /// congruent-to
    case congruentTo = "\u{FFA3}"
    /// container
    case container = "\u{EE47}"
    /// container-off
    case containerOff = "\u{F107}"
    /// contract
    case contract = "\u{FEFB}"
    /// contrast
    case contrast = "\u{EC4E}"
    /// contrast-2
    case contrast2 = "\u{EFC7}"
    /// contrast-2-off
    case contrast2Off = "\u{F3DA}"
    /// contrast-off
    case contrastOff = "\u{F3DB}"
    /// cooker
    case cooker = "\u{F57A}"
    /// cookie
    case cookie = "\u{FDB1}"
    /// cookie-man
    case cookieMan = "\u{FDB2}"
    /// cookie-off
    case cookieOff = "\u{F0D7}"
    /// copy
    case copy = "\u{EA7A}"
    /// copy-check
    case copyCheck = "\u{FDB0}"
    /// copy-minus
    case copyMinus = "\u{FDAF}"
    /// copy-off
    case copyOff = "\u{F0D8}"
    /// copy-plus
    case copyPlus = "\u{FDAE}"
    /// copy-x
    case copyX = "\u{FDAD}"
    /// copyleft
    case copyleft = "\u{EC3D}"
    /// copyleft-off
    case copyleftOff = "\u{F0D9}"
    /// copyright
    case copyright = "\u{EA7B}"
    /// copyright-off
    case copyrightOff = "\u{F0DA}"
    /// corner-down-left
    case cornerDownLeft = "\u{EA7C}"
    /// corner-down-left-double
    case cornerDownLeftDouble = "\u{EE48}"
    /// corner-down-right
    case cornerDownRight = "\u{EA7D}"
    /// corner-down-right-double
    case cornerDownRightDouble = "\u{EE49}"
    /// corner-left-down
    case cornerLeftDown = "\u{EA7E}"
    /// corner-left-down-double
    case cornerLeftDownDouble = "\u{EE4A}"
    /// corner-left-up
    case cornerLeftUp = "\u{EA7F}"
    /// corner-left-up-double
    case cornerLeftUpDouble = "\u{EE4B}"
    /// corner-right-down
    case cornerRightDown = "\u{EA80}"
    /// corner-right-down-double
    case cornerRightDownDouble = "\u{EE4C}"
    /// corner-right-up
    case cornerRightUp = "\u{EA81}"
    /// corner-right-up-double
    case cornerRightUpDouble = "\u{EE4D}"
    /// corner-up-left
    case cornerUpLeft = "\u{EA82}"
    /// corner-up-left-double
    case cornerUpLeftDouble = "\u{EE4E}"
    /// corner-up-right
    case cornerUpRight = "\u{EA83}"
    /// corner-up-right-double
    case cornerUpRightDouble = "\u{EE4F}"
    /// cpu
    case cpu = "\u{EF8E}"
    /// cpu-2
    case cpu2 = "\u{F075}"
    /// cpu-off
    case cpuOff = "\u{F108}"
    /// crane
    case crane = "\u{EF27}"
    /// crane-off
    case craneOff = "\u{F109}"
    /// creative-commons
    case creativeCommons = "\u{EFB3}"
    /// creative-commons-by
    case creativeCommonsBy = "\u{F21F}"
    /// creative-commons-nc
    case creativeCommonsNc = "\u{F220}"
    /// creative-commons-nd
    case creativeCommonsNd = "\u{F221}"
    /// creative-commons-off
    case creativeCommonsOff = "\u{F10A}"
    /// creative-commons-sa
    case creativeCommonsSa = "\u{F222}"
    /// creative-commons-zero
    case creativeCommonsZero = "\u{F223}"
    /// credit-card
    case creditCard = "\u{EA84}"
    /// credit-card-off
    case creditCardOff = "\u{ED11}"
    /// credit-card-pay
    case creditCardPay = "\u{FD32}"
    /// credit-card-refund
    case creditCardRefund = "\u{FD33}"
    /// cricket
    case cricket = "\u{F09A}"
    /// crop
    case crop = "\u{EA85}"
    /// crop-1-1
    case crop11 = "\u{FD50}"
    /// crop-16-9
    case crop169 = "\u{FD51}"
    /// crop-3-2
    case crop32 = "\u{FD52}"
    /// crop-5-4
    case crop54 = "\u{FD53}"
    /// crop-7-5
    case crop75 = "\u{FD54}"
    /// crop-landscape
    case cropLandscape = "\u{FD55}"
    /// crop-portrait
    case cropPortrait = "\u{FD56}"
    /// cross
    case cross = "\u{EF8F}"
    /// cross-off
    case crossOff = "\u{F10B}"
    /// crosshair
    case crosshair = "\u{EC3E}"
    /// crown
    case crown = "\u{ED12}"
    /// crown-off
    case crownOff = "\u{EE50}"
    /// crutches
    case crutches = "\u{EF5B}"
    /// crutches-off
    case crutchesOff = "\u{F10C}"
    /// crystal-ball
    case crystalBall = "\u{F57B}"
    /// csv
    case csv = "\u{F791}"
    /// cube
    case cube = "\u{FA97}"
    /// cube-3d-sphere
    case cube3dSphere = "\u{ECD7}"
    /// cube-3d-sphere-off
    case cube3dSphereOff = "\u{F3B5}"
    /// cube-off
    case cubeOff = "\u{FA95}"
    /// cube-plus
    case cubePlus = "\u{FA96}"
    /// cube-send
    case cubeSend = "\u{F61B}"
    /// cube-spark
    case cubeSpark = "\u{FFBB}"
    /// cube-unfolded
    case cubeUnfolded = "\u{F61C}"
    /// cup
    case cup = "\u{EF28}"
    /// cup-off
    case cupOff = "\u{F10D}"
    /// curling
    case curling = "\u{EFC8}"
    /// curly-loop
    case curlyLoop = "\u{ECDA}"
    /// currency
    case currency = "\u{EFA6}"
    /// currency-afghani
    case currencyAfghani = "\u{F65E}"
    /// currency-bahraini
    case currencyBahraini = "\u{EE51}"
    /// currency-baht
    case currencyBaht = "\u{F08A}"
    /// currency-bitcoin
    case currencyBitcoin = "\u{EBAB}"
    /// currency-cent
    case currencyCent = "\u{EE53}"
    /// currency-dinar
    case currencyDinar = "\u{EE54}"
    /// currency-dirham
    case currencyDirham = "\u{EE55}"
    /// currency-dogecoin
    case currencyDogecoin = "\u{EF4B}"
    /// currency-dollar
    case currencyDollar = "\u{EB84}"
    /// currency-dollar-australian
    case currencyDollarAustralian = "\u{EE56}"
    /// currency-dollar-brunei
    case currencyDollarBrunei = "\u{F36C}"
    /// currency-dollar-canadian
    case currencyDollarCanadian = "\u{EE57}"
    /// currency-dollar-guyanese
    case currencyDollarGuyanese = "\u{F36D}"
    /// currency-dollar-off
    case currencyDollarOff = "\u{F3DC}"
    /// currency-dollar-singapore
    case currencyDollarSingapore = "\u{EE58}"
    /// currency-dollar-zimbabwean
    case currencyDollarZimbabwean = "\u{F36E}"
    /// currency-dong
    case currencyDong = "\u{F36F}"
    /// currency-dram
    case currencyDram = "\u{F370}"
    /// currency-ethereum
    case currencyEthereum = "\u{EE59}"
    /// currency-euro
    case currencyEuro = "\u{EB85}"
    /// currency-euro-off
    case currencyEuroOff = "\u{F3DD}"
    /// currency-florin
    case currencyFlorin = "\u{FAF5}"
    /// currency-forint
    case currencyForint = "\u{EE5A}"
    /// currency-frank
    case currencyFrank = "\u{EE5B}"
    /// currency-guarani
    case currencyGuarani = "\u{F371}"
    /// currency-hryvnia
    case currencyHryvnia = "\u{F372}"
    /// currency-iranian-rial
    case currencyIranianRial = "\u{FA58}"
    /// currency-kip
    case currencyKip = "\u{F373}"
    /// currency-krone-czech
    case currencyKroneCzech = "\u{EE5C}"
    /// currency-krone-danish
    case currencyKroneDanish = "\u{EE5D}"
    /// currency-krone-swedish
    case currencyKroneSwedish = "\u{EE5E}"
    /// currency-lari
    case currencyLari = "\u{F374}"
    /// currency-leu
    case currencyLeu = "\u{EE5F}"
    /// currency-lira
    case currencyLira = "\u{EE60}"
    /// currency-litecoin
    case currencyLitecoin = "\u{EE61}"
    /// currency-lyd
    case currencyLyd = "\u{F375}"
    /// currency-manat
    case currencyManat = "\u{F376}"
    /// currency-monero
    case currencyMonero = "\u{F377}"
    /// currency-naira
    case currencyNaira = "\u{EE62}"
    /// currency-nano
    case currencyNano = "\u{F7A6}"
    /// currency-off
    case currencyOff = "\u{F3DE}"
    /// currency-paanga
    case currencyPaanga = "\u{F378}"
    /// currency-peso
    case currencyPeso = "\u{F65F}"
    /// currency-pound
    case currencyPound = "\u{EBAC}"
    /// currency-pound-off
    case currencyPoundOff = "\u{F3DF}"
    /// currency-quetzal
    case currencyQuetzal = "\u{F379}"
    /// currency-real
    case currencyReal = "\u{EE63}"
    /// currency-renminbi
    case currencyRenminbi = "\u{EE64}"
    /// currency-ripple
    case currencyRipple = "\u{EE65}"
    /// currency-riyal
    case currencyRiyal = "\u{EE66}"
    /// currency-rubel
    case currencyRubel = "\u{EE67}"
    /// currency-rufiyaa
    case currencyRufiyaa = "\u{F37A}"
    /// currency-rupee
    case currencyRupee = "\u{EBAD}"
    /// currency-rupee-nepalese
    case currencyRupeeNepalese = "\u{F37B}"
    /// currency-shekel
    case currencyShekel = "\u{EE68}"
    /// currency-solana
    case currencySolana = "\u{F4A1}"
    /// currency-som
    case currencySom = "\u{F37C}"
    /// currency-taka
    case currencyTaka = "\u{EE69}"
    /// currency-tenge
    case currencyTenge = "\u{F37D}"
    /// currency-tugrik
    case currencyTugrik = "\u{EE6A}"
    /// currency-won
    case currencyWon = "\u{EE6B}"
    /// currency-xrp
    case currencyXrp = "\u{FD34}"
    /// currency-yen
    case currencyYen = "\u{EBAE}"
    /// currency-yen-off
    case currencyYenOff = "\u{F3E0}"
    /// currency-yuan
    case currencyYuan = "\u{F29A}"
    /// currency-zloty
    case currencyZloty = "\u{EE6C}"
    /// current-location
    case currentLocation = "\u{ECEF}"
    /// current-location-off
    case currentLocationOff = "\u{F10E}"
    /// cursor-off
    case cursorOff = "\u{F10F}"
    /// cursor-text
    case cursorText = "\u{EE6D}"
    /// cut
    case cut = "\u{EA86}"
    /// cylinder
    case cylinder = "\u{F54C}"
    /// cylinder-off
    case cylinderOff = "\u{FA98}"
    /// cylinder-plus
    case cylinderPlus = "\u{FA99}"
    /// dashboard
    case dashboard = "\u{EA87}"
    /// dashboard-off
    case dashboardOff = "\u{F3E1}"
    /// database
    case database = "\u{EA88}"
    /// database-cog
    case databaseCog = "\u{FA10}"
    /// database-dollar
    case databaseDollar = "\u{FA11}"
    /// database-edit
    case databaseEdit = "\u{FA12}"
    /// database-exclamation
    case databaseExclamation = "\u{FA13}"
    /// database-export
    case databaseExport = "\u{EE6E}"
    /// database-heart
    case databaseHeart = "\u{FA14}"
    /// database-import
    case databaseImport = "\u{EE6F}"
    /// database-leak
    case databaseLeak = "\u{FA15}"
    /// database-minus
    case databaseMinus = "\u{FA16}"
    /// database-off
    case databaseOff = "\u{EE70}"
    /// database-plus
    case databasePlus = "\u{FA17}"
    /// database-search
    case databaseSearch = "\u{FA18}"
    /// database-share
    case databaseShare = "\u{FA19}"
    /// database-smile
    case databaseSmile = "\u{FD9B}"
    /// database-star
    case databaseStar = "\u{FA1A}"
    /// database-x
    case databaseX = "\u{FA1B}"
    /// deaf
    case deaf = "\u{101AC}"
    /// decimal
    case decimal = "\u{FA26}"
    /// deer
    case deer = "\u{F4C5}"
    /// delta
    case delta = "\u{F53C}"
    /// dental
    case dental = "\u{F025}"
    /// dental-broken
    case dentalBroken = "\u{F286}"
    /// dental-off
    case dentalOff = "\u{F110}"
    /// deselect
    case deselect = "\u{F9F3}"
    /// desk
    case desk = "\u{FD35}"
    /// details
    case details = "\u{EE71}"
    /// details-off
    case detailsOff = "\u{F3E2}"
    /// device-airpods
    case deviceAirpods = "\u{F5A9}"
    /// device-airpods-case
    case deviceAirpodsCase = "\u{F646}"
    /// device-airtag
    case deviceAirtag = "\u{FAE6}"
    /// device-analytics
    case deviceAnalytics = "\u{EE72}"
    /// device-audio-tape
    case deviceAudioTape = "\u{EE73}"
    /// device-camera-phone
    case deviceCameraPhone = "\u{F233}"
    /// device-cctv
    case deviceCctv = "\u{EE74}"
    /// device-cctv-off
    case deviceCctvOff = "\u{F3E3}"
    /// device-computer-camera
    case deviceComputerCamera = "\u{EE76}"
    /// device-computer-camera-off
    case deviceComputerCameraOff = "\u{EE75}"
    /// device-desktop
    case deviceDesktop = "\u{EA89}"
    /// device-desktop-analytics
    case deviceDesktopAnalytics = "\u{EE77}"
    /// device-desktop-bolt
    case deviceDesktopBolt = "\u{F85E}"
    /// device-desktop-cancel
    case deviceDesktopCancel = "\u{F85F}"
    /// device-desktop-check
    case deviceDesktopCheck = "\u{F860}"
    /// device-desktop-code
    case deviceDesktopCode = "\u{F861}"
    /// device-desktop-cog
    case deviceDesktopCog = "\u{F862}"
    /// device-desktop-dollar
    case deviceDesktopDollar = "\u{F863}"
    /// device-desktop-down
    case deviceDesktopDown = "\u{F864}"
    /// device-desktop-exclamation
    case deviceDesktopExclamation = "\u{F865}"
    /// device-desktop-heart
    case deviceDesktopHeart = "\u{F866}"
    /// device-desktop-minus
    case deviceDesktopMinus = "\u{F867}"
    /// device-desktop-off
    case deviceDesktopOff = "\u{EE78}"
    /// device-desktop-pause
    case deviceDesktopPause = "\u{F868}"
    /// device-desktop-pin
    case deviceDesktopPin = "\u{F869}"
    /// device-desktop-plus
    case deviceDesktopPlus = "\u{F86A}"
    /// device-desktop-question
    case deviceDesktopQuestion = "\u{F86B}"
    /// device-desktop-search
    case deviceDesktopSearch = "\u{F86C}"
    /// device-desktop-share
    case deviceDesktopShare = "\u{F86D}"
    /// device-desktop-star
    case deviceDesktopStar = "\u{F86E}"
    /// device-desktop-up
    case deviceDesktopUp = "\u{F86F}"
    /// device-desktop-x
    case deviceDesktopX = "\u{F870}"
    /// device-floppy
    case deviceFloppy = "\u{EB62}"
    /// device-gamepad
    case deviceGamepad = "\u{EB63}"
    /// device-gamepad-2
    case deviceGamepad2 = "\u{F1D2}"
    /// device-gamepad-3
    case deviceGamepad3 = "\u{FC58}"
    /// device-heart-monitor
    case deviceHeartMonitor = "\u{F060}"
    /// device-imac
    case deviceImac = "\u{F7A7}"
    /// device-imac-bolt
    case deviceImacBolt = "\u{F871}"
    /// device-imac-cancel
    case deviceImacCancel = "\u{F872}"
    /// device-imac-check
    case deviceImacCheck = "\u{F873}"
    /// device-imac-code
    case deviceImacCode = "\u{F874}"
    /// device-imac-cog
    case deviceImacCog = "\u{F875}"
    /// device-imac-dollar
    case deviceImacDollar = "\u{F876}"
    /// device-imac-down
    case deviceImacDown = "\u{F877}"
    /// device-imac-exclamation
    case deviceImacExclamation = "\u{F878}"
    /// device-imac-heart
    case deviceImacHeart = "\u{F879}"
    /// device-imac-minus
    case deviceImacMinus = "\u{F87A}"
    /// device-imac-off
    case deviceImacOff = "\u{F87B}"
    /// device-imac-pause
    case deviceImacPause = "\u{F87C}"
    /// device-imac-pin
    case deviceImacPin = "\u{F87D}"
    /// device-imac-plus
    case deviceImacPlus = "\u{F87E}"
    /// device-imac-question
    case deviceImacQuestion = "\u{F87F}"
    /// device-imac-search
    case deviceImacSearch = "\u{F880}"
    /// device-imac-share
    case deviceImacShare = "\u{F881}"
    /// device-imac-star
    case deviceImacStar = "\u{F882}"
    /// device-imac-up
    case deviceImacUp = "\u{F883}"
    /// device-imac-x
    case deviceImacX = "\u{F884}"
    /// device-ipad
    case deviceIpad = "\u{F648}"
    /// device-ipad-bolt
    case deviceIpadBolt = "\u{F885}"
    /// device-ipad-cancel
    case deviceIpadCancel = "\u{F886}"
    /// device-ipad-check
    case deviceIpadCheck = "\u{F887}"
    /// device-ipad-code
    case deviceIpadCode = "\u{F888}"
    /// device-ipad-cog
    case deviceIpadCog = "\u{F889}"
    /// device-ipad-dollar
    case deviceIpadDollar = "\u{F88A}"
    /// device-ipad-down
    case deviceIpadDown = "\u{F88B}"
    /// device-ipad-exclamation
    case deviceIpadExclamation = "\u{F88C}"
    /// device-ipad-heart
    case deviceIpadHeart = "\u{F88D}"
    /// device-ipad-horizontal
    case deviceIpadHorizontal = "\u{F647}"
    /// device-ipad-horizontal-bolt
    case deviceIpadHorizontalBolt = "\u{F88E}"
    /// device-ipad-horizontal-cancel
    case deviceIpadHorizontalCancel = "\u{F88F}"
    /// device-ipad-horizontal-check
    case deviceIpadHorizontalCheck = "\u{F890}"
    /// device-ipad-horizontal-code
    case deviceIpadHorizontalCode = "\u{F891}"
    /// device-ipad-horizontal-cog
    case deviceIpadHorizontalCog = "\u{F892}"
    /// device-ipad-horizontal-dollar
    case deviceIpadHorizontalDollar = "\u{F893}"
    /// device-ipad-horizontal-down
    case deviceIpadHorizontalDown = "\u{F894}"
    /// device-ipad-horizontal-exclamation
    case deviceIpadHorizontalExclamation = "\u{F895}"
    /// device-ipad-horizontal-heart
    case deviceIpadHorizontalHeart = "\u{F896}"
    /// device-ipad-horizontal-minus
    case deviceIpadHorizontalMinus = "\u{F897}"
    /// device-ipad-horizontal-off
    case deviceIpadHorizontalOff = "\u{F898}"
    /// device-ipad-horizontal-pause
    case deviceIpadHorizontalPause = "\u{F899}"
    /// device-ipad-horizontal-pin
    case deviceIpadHorizontalPin = "\u{F89A}"
    /// device-ipad-horizontal-plus
    case deviceIpadHorizontalPlus = "\u{F89B}"
    /// device-ipad-horizontal-question
    case deviceIpadHorizontalQuestion = "\u{F89C}"
    /// device-ipad-horizontal-search
    case deviceIpadHorizontalSearch = "\u{F89D}"
    /// device-ipad-horizontal-share
    case deviceIpadHorizontalShare = "\u{F89E}"
    /// device-ipad-horizontal-star
    case deviceIpadHorizontalStar = "\u{F89F}"
    /// device-ipad-horizontal-up
    case deviceIpadHorizontalUp = "\u{F8A0}"
    /// device-ipad-horizontal-x
    case deviceIpadHorizontalX = "\u{F8A1}"
    /// device-ipad-minus
    case deviceIpadMinus = "\u{F8A2}"
    /// device-ipad-off
    case deviceIpadOff = "\u{F8A3}"
    /// device-ipad-pause
    case deviceIpadPause = "\u{F8A4}"
    /// device-ipad-pin
    case deviceIpadPin = "\u{F8A5}"
    /// device-ipad-plus
    case deviceIpadPlus = "\u{F8A6}"
    /// device-ipad-question
    case deviceIpadQuestion = "\u{F8A7}"
    /// device-ipad-search
    case deviceIpadSearch = "\u{F8A8}"
    /// device-ipad-share
    case deviceIpadShare = "\u{F8A9}"
    /// device-ipad-star
    case deviceIpadStar = "\u{F8AA}"
    /// device-ipad-up
    case deviceIpadUp = "\u{F8AB}"
    /// device-ipad-x
    case deviceIpadX = "\u{F8AC}"
    /// device-landline-phone
    case deviceLandlinePhone = "\u{F649}"
    /// device-laptop
    case deviceLaptop = "\u{EB64}"
    /// device-laptop-off
    case deviceLaptopOff = "\u{F061}"
    /// device-mobile
    case deviceMobile = "\u{EA8A}"
    /// device-mobile-bolt
    case deviceMobileBolt = "\u{F8AD}"
    /// device-mobile-cancel
    case deviceMobileCancel = "\u{F8AE}"
    /// device-mobile-charging
    case deviceMobileCharging = "\u{F224}"
    /// device-mobile-check
    case deviceMobileCheck = "\u{F8AF}"
    /// device-mobile-code
    case deviceMobileCode = "\u{F8B0}"
    /// device-mobile-cog
    case deviceMobileCog = "\u{F8B1}"
    /// device-mobile-dollar
    case deviceMobileDollar = "\u{F8B2}"
    /// device-mobile-down
    case deviceMobileDown = "\u{F8B3}"
    /// device-mobile-exclamation
    case deviceMobileExclamation = "\u{F8B4}"
    /// device-mobile-heart
    case deviceMobileHeart = "\u{F8B5}"
    /// device-mobile-message
    case deviceMobileMessage = "\u{EE79}"
    /// device-mobile-minus
    case deviceMobileMinus = "\u{F8B6}"
    /// device-mobile-off
    case deviceMobileOff = "\u{F062}"
    /// device-mobile-pause
    case deviceMobilePause = "\u{F8B7}"
    /// device-mobile-pin
    case deviceMobilePin = "\u{F8B8}"
    /// device-mobile-plus
    case deviceMobilePlus = "\u{F8B9}"
    /// device-mobile-question
    case deviceMobileQuestion = "\u{F8BA}"
    /// device-mobile-rotated
    case deviceMobileRotated = "\u{ECDB}"
    /// device-mobile-search
    case deviceMobileSearch = "\u{F8BB}"
    /// device-mobile-share
    case deviceMobileShare = "\u{F8BC}"
    /// device-mobile-star
    case deviceMobileStar = "\u{F8BD}"
    /// device-mobile-up
    case deviceMobileUp = "\u{F8BE}"
    /// device-mobile-vibration
    case deviceMobileVibration = "\u{EB86}"
    /// device-mobile-x
    case deviceMobileX = "\u{F8BF}"
    /// device-nintendo
    case deviceNintendo = "\u{F026}"
    /// device-nintendo-off
    case deviceNintendoOff = "\u{F111}"
    /// device-projector
    case deviceProjector = "\u{FC11}"
    /// device-remote
    case deviceRemote = "\u{F792}"
    /// device-sd-card
    case deviceSdCard = "\u{F384}"
    /// device-sim
    case deviceSim = "\u{F4B2}"
    /// device-sim-1
    case deviceSim1 = "\u{F4AF}"
    /// device-sim-2
    case deviceSim2 = "\u{F4B0}"
    /// device-sim-3
    case deviceSim3 = "\u{F4B1}"
    /// device-speaker
    case deviceSpeaker = "\u{EA8B}"
    /// device-speaker-off
    case deviceSpeakerOff = "\u{F112}"
    /// device-tablet
    case deviceTablet = "\u{EA8C}"
    /// device-tablet-bolt
    case deviceTabletBolt = "\u{F8C0}"
    /// device-tablet-cancel
    case deviceTabletCancel = "\u{F8C1}"
    /// device-tablet-check
    case deviceTabletCheck = "\u{F8C2}"
    /// device-tablet-code
    case deviceTabletCode = "\u{F8C3}"
    /// device-tablet-cog
    case deviceTabletCog = "\u{F8C4}"
    /// device-tablet-dollar
    case deviceTabletDollar = "\u{F8C5}"
    /// device-tablet-down
    case deviceTabletDown = "\u{F8C6}"
    /// device-tablet-exclamation
    case deviceTabletExclamation = "\u{F8C7}"
    /// device-tablet-heart
    case deviceTabletHeart = "\u{F8C8}"
    /// device-tablet-minus
    case deviceTabletMinus = "\u{F8C9}"
    /// device-tablet-off
    case deviceTabletOff = "\u{F063}"
    /// device-tablet-pause
    case deviceTabletPause = "\u{F8CA}"
    /// device-tablet-pin
    case deviceTabletPin = "\u{F8CB}"
    /// device-tablet-plus
    case deviceTabletPlus = "\u{F8CC}"
    /// device-tablet-question
    case deviceTabletQuestion = "\u{F8CD}"
    /// device-tablet-search
    case deviceTabletSearch = "\u{F8CE}"
    /// device-tablet-share
    case deviceTabletShare = "\u{F8CF}"
    /// device-tablet-star
    case deviceTabletStar = "\u{F8D0}"
    /// device-tablet-up
    case deviceTabletUp = "\u{F8D1}"
    /// device-tablet-x
    case deviceTabletX = "\u{F8D2}"
    /// device-tv
    case deviceTv = "\u{EA8D}"
    /// device-tv-off
    case deviceTvOff = "\u{F064}"
    /// device-tv-old
    case deviceTvOld = "\u{F1D3}"
    /// device-unknown
    case deviceUnknown = "\u{FEF4}"
    /// device-usb
    case deviceUsb = "\u{FC59}"
    /// device-vision-pro
    case deviceVisionPro = "\u{FAE7}"
    /// device-watch
    case deviceWatch = "\u{EBF9}"
    /// device-watch-bolt
    case deviceWatchBolt = "\u{F8D3}"
    /// device-watch-cancel
    case deviceWatchCancel = "\u{F8D4}"
    /// device-watch-check
    case deviceWatchCheck = "\u{F8D5}"
    /// device-watch-code
    case deviceWatchCode = "\u{F8D6}"
    /// device-watch-cog
    case deviceWatchCog = "\u{F8D7}"
    /// device-watch-dollar
    case deviceWatchDollar = "\u{F8D8}"
    /// device-watch-down
    case deviceWatchDown = "\u{F8D9}"
    /// device-watch-exclamation
    case deviceWatchExclamation = "\u{F8DA}"
    /// device-watch-heart
    case deviceWatchHeart = "\u{F8DB}"
    /// device-watch-minus
    case deviceWatchMinus = "\u{F8DC}"
    /// device-watch-off
    case deviceWatchOff = "\u{F065}"
    /// device-watch-pause
    case deviceWatchPause = "\u{F8DD}"
    /// device-watch-pin
    case deviceWatchPin = "\u{F8DE}"
    /// device-watch-plus
    case deviceWatchPlus = "\u{F8DF}"
    /// device-watch-question
    case deviceWatchQuestion = "\u{F8E0}"
    /// device-watch-search
    case deviceWatchSearch = "\u{F8E1}"
    /// device-watch-share
    case deviceWatchShare = "\u{F8E2}"
    /// device-watch-star
    case deviceWatchStar = "\u{F8E3}"
    /// device-watch-stats
    case deviceWatchStats = "\u{EF7D}"
    /// device-watch-stats-2
    case deviceWatchStats2 = "\u{EF7C}"
    /// device-watch-up
    case deviceWatchUp = "\u{F8E4}"
    /// device-watch-x
    case deviceWatchX = "\u{F8E5}"
    /// devices
    case devices = "\u{EB87}"
    /// devices-2
    case devices2 = "\u{ED29}"
    /// devices-bolt
    case devicesBolt = "\u{F8E6}"
    /// devices-cancel
    case devicesCancel = "\u{F8E7}"
    /// devices-check
    case devicesCheck = "\u{F8E8}"
    /// devices-code
    case devicesCode = "\u{F8E9}"
    /// devices-cog
    case devicesCog = "\u{F8EA}"
    /// devices-dollar
    case devicesDollar = "\u{F8EB}"
    /// devices-down
    case devicesDown = "\u{F8EC}"
    /// devices-exclamation
    case devicesExclamation = "\u{F8ED}"
    /// devices-heart
    case devicesHeart = "\u{F8EE}"
    /// devices-minus
    case devicesMinus = "\u{F8EF}"
    /// devices-off
    case devicesOff = "\u{F3E4}"
    /// devices-pause
    case devicesPause = "\u{F8F0}"
    /// devices-pc
    case devicesPc = "\u{EE7A}"
    /// devices-pc-off
    case devicesPcOff = "\u{F113}"
    /// devices-pin
    case devicesPin = "\u{F8F1}"
    /// devices-plus
    case devicesPlus = "\u{F8F2}"
    /// devices-question
    case devicesQuestion = "\u{F8F3}"
    /// devices-search
    case devicesSearch = "\u{F8F4}"
    /// devices-share
    case devicesShare = "\u{F8F5}"
    /// devices-star
    case devicesStar = "\u{F8F6}"
    /// devices-up
    case devicesUp = "\u{F8F7}"
    /// devices-x
    case devicesX = "\u{F8F8}"
    /// diabolo
    case diabolo = "\u{FA9C}"
    /// diabolo-off
    case diaboloOff = "\u{FA9A}"
    /// diabolo-plus
    case diaboloPlus = "\u{FA9B}"
    /// dialpad
    case dialpad = "\u{F067}"
    /// dialpad-off
    case dialpadOff = "\u{F114}"
    /// diamond
    case diamond = "\u{EB65}"
    /// diamond-off
    case diamondOff = "\u{F115}"
    /// diamonds
    case diamonds = "\u{EFF5}"
    /// diaper
    case diaper = "\u{FFA2}"
    /// dice
    case dice = "\u{EB66}"
    /// dice-1
    case dice1 = "\u{F08B}"
    /// dice-2
    case dice2 = "\u{F08C}"
    /// dice-3
    case dice3 = "\u{F08D}"
    /// dice-4
    case dice4 = "\u{F08E}"
    /// dice-5
    case dice5 = "\u{F08F}"
    /// dice-6
    case dice6 = "\u{F090}"
    /// dimensions
    case dimensions = "\u{EE7B}"
    /// direction
    case direction = "\u{EBFB}"
    /// direction-arrows
    case directionArrows = "\u{FD36}"
    /// direction-horizontal
    case directionHorizontal = "\u{EBFA}"
    /// direction-sign
    case directionSign = "\u{F1F7}"
    /// direction-sign-off
    case directionSignOff = "\u{F3E5}"
    /// directions
    case directions = "\u{EA8E}"
    /// directions-off
    case directionsOff = "\u{F116}"
    /// disabled
    case disabled = "\u{EA8F}"
    /// disabled-2
    case disabled2 = "\u{EBAF}"
    /// disabled-off
    case disabledOff = "\u{F117}"
    /// disc
    case disc = "\u{EA90}"
    /// disc-golf
    case discGolf = "\u{F385}"
    /// disc-off
    case discOff = "\u{F118}"
    /// discount
    case discount = "\u{EBBD}"
    /// discount-off
    case discountOff = "\u{F3E7}"
    /// divide
    case divide = "\u{ED5C}"
    /// dna
    case dna = "\u{EE7D}"
    /// dna-2
    case dna2 = "\u{EF5C}"
    /// dna-2-off
    case dna2Off = "\u{F119}"
    /// dna-off
    case dnaOff = "\u{F11A}"
    /// dog
    case dog = "\u{F660}"
    /// dog-bowl
    case dogBowl = "\u{EF29}"
    /// door
    case door = "\u{EF4E}"
    /// door-enter
    case doorEnter = "\u{EF4C}"
    /// door-exit
    case doorExit = "\u{EF4D}"
    /// door-off
    case doorOff = "\u{F11B}"
    /// dots
    case dots = "\u{EA95}"
    /// dots-circle-horizontal
    case dotsCircleHorizontal = "\u{EA91}"
    /// dots-diagonal
    case dotsDiagonal = "\u{EA93}"
    /// dots-diagonal-2
    case dotsDiagonal2 = "\u{EA92}"
    /// dots-vertical
    case dotsVertical = "\u{EA94}"
    /// download
    case download = "\u{EA96}"
    /// download-off
    case downloadOff = "\u{F11C}"
    /// drag-drop
    case dragDrop = "\u{EB89}"
    /// drag-drop-2
    case dragDrop2 = "\u{EB88}"
    /// drone
    case drone = "\u{ED79}"
    /// drone-off
    case droneOff = "\u{EE7E}"
    /// drop-circle
    case dropCircle = "\u{EFDE}"
    /// droplet
    case droplet = "\u{EA97}"
    /// droplet-bolt
    case dropletBolt = "\u{F8F9}"
    /// droplet-cancel
    case dropletCancel = "\u{F8FA}"
    /// droplet-check
    case dropletCheck = "\u{F8FB}"
    /// droplet-code
    case dropletCode = "\u{F8FC}"
    /// droplet-cog
    case dropletCog = "\u{F8FD}"
    /// droplet-dollar
    case dropletDollar = "\u{F8FE}"
    /// droplet-down
    case dropletDown = "\u{F8FF}"
    /// droplet-exclamation
    case dropletExclamation = "\u{F900}"
    /// droplet-half
    case dropletHalf = "\u{EE82}"
    /// droplet-half-2
    case dropletHalf2 = "\u{EE81}"
    /// droplet-heart
    case dropletHeart = "\u{F901}"
    /// droplet-minus
    case dropletMinus = "\u{F902}"
    /// droplet-off
    case dropletOff = "\u{EE83}"
    /// droplet-pause
    case dropletPause = "\u{F903}"
    /// droplet-pin
    case dropletPin = "\u{F904}"
    /// droplet-plus
    case dropletPlus = "\u{F905}"
    /// droplet-question
    case dropletQuestion = "\u{F906}"
    /// droplet-search
    case dropletSearch = "\u{F907}"
    /// droplet-share
    case dropletShare = "\u{F908}"
    /// droplet-star
    case dropletStar = "\u{F909}"
    /// droplet-up
    case dropletUp = "\u{F90A}"
    /// droplet-x
    case dropletX = "\u{F90B}"
    /// droplets
    case droplets = "\u{FC12}"
    /// dual-screen
    case dualScreen = "\u{FA59}"
    /// dumpling
    case dumpling = "\u{FEB5}"
    /// e-passport
    case ePassport = "\u{F4DF}"
    /// ear
    case ear = "\u{EBCE}"
    /// ear-off
    case earOff = "\u{EE84}"
    /// ear-scan
    case earScan = "\u{FD57}"
    /// ease-in
    case easeIn = "\u{F573}"
    /// ease-in-control-point
    case easeInControlPoint = "\u{F570}"
    /// ease-in-out
    case easeInOut = "\u{F572}"
    /// ease-in-out-control-points
    case easeInOutControlPoints = "\u{F571}"
    /// ease-out
    case easeOut = "\u{F575}"
    /// ease-out-control-point
    case easeOutControlPoint = "\u{F574}"
    /// edit
    case edit = "\u{EA98}"
    /// edit-circle
    case editCircle = "\u{EE85}"
    /// edit-circle-off
    case editCircleOff = "\u{F11D}"
    /// edit-off
    case editOff = "\u{F11E}"
    /// egg
    case egg = "\u{EB8A}"
    /// egg-cracked
    case eggCracked = "\u{F2D6}"
    /// egg-fried
    case eggFried = "\u{F386}"
    /// egg-off
    case eggOff = "\u{F11F}"
    /// eggs
    case eggs = "\u{F500}"
    /// elevator
    case elevator = "\u{EFDF}"
    /// elevator-off
    case elevatorOff = "\u{F3E8}"
    /// emergency-bed
    case emergencyBed = "\u{EF5D}"
    /// empathize
    case empathize = "\u{F29B}"
    /// empathize-off
    case empathizeOff = "\u{F3E9}"
    /// emphasis
    case emphasis = "\u{EBCF}"
    /// engine
    case engine = "\u{EF7E}"
    /// engine-off
    case engineOff = "\u{F120}"
    /// equal
    case equal = "\u{EE87}"
    /// equal-double
    case equalDouble = "\u{F4E1}"
    /// equal-not
    case equalNot = "\u{EE86}"
    /// eraser
    case eraser = "\u{EB8B}"
    /// eraser-off
    case eraserOff = "\u{F121}"
    /// error-404
    case error404 = "\u{F027}"
    /// error-404-off
    case error404Off = "\u{F122}"
    /// escalator
    case escalator = "\u{FB06}"
    /// escalator-down
    case escalatorDown = "\u{FB04}"
    /// escalator-up
    case escalatorUp = "\u{FB05}"
    /// exchange
    case exchange = "\u{EBE7}"
    /// exchange-off
    case exchangeOff = "\u{F123}"
    /// exclamation-circle
    case exclamationCircle = "\u{F634}"
    /// exclamation-mark
    case exclamationMark = "\u{EFB4}"
    /// exclamation-mark-off
    case exclamationMarkOff = "\u{F124}"
    /// explicit
    case explicit = "\u{F256}"
    /// explicit-off
    case explicitOff = "\u{F3EA}"
    /// exposure
    case exposure = "\u{EB8C}"
    /// exposure-0
    case exposure0 = "\u{F29C}"
    /// exposure-minus-1
    case exposureMinus1 = "\u{F29D}"
    /// exposure-minus-2
    case exposureMinus2 = "\u{F29E}"
    /// exposure-off
    case exposureOff = "\u{F3EB}"
    /// exposure-plus-1
    case exposurePlus1 = "\u{F29F}"
    /// exposure-plus-2
    case exposurePlus2 = "\u{F2A0}"
    /// external-link
    case externalLink = "\u{EA99}"
    /// external-link-off
    case externalLinkOff = "\u{F125}"
    /// eye
    case eye = "\u{EA9A}"
    /// eye-bitcoin
    case eyeBitcoin = "\u{FF3D}"
    /// eye-bolt
    case eyeBolt = "\u{FB6D}"
    /// eye-cancel
    case eyeCancel = "\u{FB6E}"
    /// eye-check
    case eyeCheck = "\u{EE88}"
    /// eye-closed
    case eyeClosed = "\u{F7EC}"
    /// eye-code
    case eyeCode = "\u{FB6F}"
    /// eye-cog
    case eyeCog = "\u{F7ED}"
    /// eye-discount
    case eyeDiscount = "\u{FB70}"
    /// eye-dollar
    case eyeDollar = "\u{FB71}"
    /// eye-dotted
    case eyeDotted = "\u{FEAD}"
    /// eye-down
    case eyeDown = "\u{FB72}"
    /// eye-edit
    case eyeEdit = "\u{F7EE}"
    /// eye-exclamation
    case eyeExclamation = "\u{F7EF}"
    /// eye-heart
    case eyeHeart = "\u{F7F0}"
    /// eye-minus
    case eyeMinus = "\u{FB73}"
    /// eye-off
    case eyeOff = "\u{ECF0}"
    /// eye-pause
    case eyePause = "\u{FB74}"
    /// eye-pin
    case eyePin = "\u{FB75}"
    /// eye-plus
    case eyePlus = "\u{FB76}"
    /// eye-question
    case eyeQuestion = "\u{FB77}"
    /// eye-search
    case eyeSearch = "\u{FB78}"
    /// eye-share
    case eyeShare = "\u{FB79}"
    /// eye-spark
    case eyeSpark = "\u{FFBA}"
    /// eye-star
    case eyeStar = "\u{FB7A}"
    /// eye-table
    case eyeTable = "\u{EF5E}"
    /// eye-up
    case eyeUp = "\u{FB7B}"
    /// eye-x
    case eyeX = "\u{F7F1}"
    /// eyeglass
    case eyeglass = "\u{EE8A}"
    /// eyeglass-2
    case eyeglass2 = "\u{EE89}"
    /// eyeglass-off
    case eyeglassOff = "\u{F126}"
    /// face-id
    case faceId = "\u{EA9B}"
    /// face-id-error
    case faceIdError = "\u{EFA7}"
    /// face-mask
    case faceMask = "\u{EFB5}"
    /// face-mask-off
    case faceMaskOff = "\u{F127}"
    /// fall
    case fall = "\u{ECB9}"
    /// favicon
    case favicon = "\u{FD65}"
    /// feather
    case feather = "\u{EE8B}"
    /// feather-off
    case featherOff = "\u{F128}"
    /// fence
    case fence = "\u{EF2A}"
    /// fence-off
    case fenceOff = "\u{F129}"
    /// ferry
    case ferry = "\u{10074}"
    /// fidget-spinner
    case fidgetSpinner = "\u{F068}"
    /// file
    case file = "\u{EAA4}"
    /// file-3d
    case file3d = "\u{F032}"
    /// file-ai
    case fileAi = "\u{FFA1}"
    /// file-alert
    case fileAlert = "\u{EDE6}"
    /// file-analytics
    case fileAnalytics = "\u{EDE7}"
    /// file-arrow-left
    case fileArrowLeft = "\u{F033}"
    /// file-arrow-right
    case fileArrowRight = "\u{F034}"
    /// file-barcode
    case fileBarcode = "\u{F035}"
    /// file-bitcoin
    case fileBitcoin = "\u{FFA0}"
    /// file-broken
    case fileBroken = "\u{F501}"
    /// file-certificate
    case fileCertificate = "\u{ED4D}"
    /// file-chart
    case fileChart = "\u{F036}"
    /// file-check
    case fileCheck = "\u{EA9C}"
    /// file-code
    case fileCode = "\u{EBD0}"
    /// file-code-2
    case fileCode2 = "\u{EDE8}"
    /// file-cv
    case fileCv = "\u{FA5A}"
    /// file-database
    case fileDatabase = "\u{F037}"
    /// file-delta
    case fileDelta = "\u{F53D}"
    /// file-description
    case fileDescription = "\u{F028}"
    /// file-diff
    case fileDiff = "\u{ECF1}"
    /// file-digit
    case fileDigit = "\u{EFA8}"
    /// file-dislike
    case fileDislike = "\u{ED2A}"
    /// file-dollar
    case fileDollar = "\u{EFE0}"
    /// file-dots
    case fileDots = "\u{F038}"
    /// file-download
    case fileDownload = "\u{EA9D}"
    /// file-euro
    case fileEuro = "\u{EFE1}"
    /// file-excel
    case fileExcel = "\u{FEF3}"
    /// file-export
    case fileExport = "\u{EDE9}"
    /// file-function
    case fileFunction = "\u{F53E}"
    /// file-horizontal
    case fileHorizontal = "\u{EBB0}"
    /// file-import
    case fileImport = "\u{EDEA}"
    /// file-infinity
    case fileInfinity = "\u{F502}"
    /// file-info
    case fileInfo = "\u{EDEC}"
    /// file-invoice
    case fileInvoice = "\u{EB67}"
    /// file-isr
    case fileIsr = "\u{FEAC}"
    /// file-lambda
    case fileLambda = "\u{F53F}"
    /// file-like
    case fileLike = "\u{ED2B}"
    /// file-minus
    case fileMinus = "\u{EA9E}"
    /// file-music
    case fileMusic = "\u{EA9F}"
    /// file-neutral
    case fileNeutral = "\u{FD22}"
    /// file-off
    case fileOff = "\u{ECF2}"
    /// file-orientation
    case fileOrientation = "\u{F2A1}"
    /// file-pencil
    case filePencil = "\u{F039}"
    /// file-percent
    case filePercent = "\u{F540}"
    /// file-phone
    case filePhone = "\u{ECDC}"
    /// file-plus
    case filePlus = "\u{EAA0}"
    /// file-power
    case filePower = "\u{F03A}"
    /// file-report
    case fileReport = "\u{EDED}"
    /// file-rss
    case fileRss = "\u{F03B}"
    /// file-sad
    case fileSad = "\u{FD23}"
    /// file-scissors
    case fileScissors = "\u{F03C}"
    /// file-search
    case fileSearch = "\u{ED5D}"
    /// file-settings
    case fileSettings = "\u{F029}"
    /// file-shredder
    case fileShredder = "\u{EAA1}"
    /// file-signal
    case fileSignal = "\u{F03D}"
    /// file-smile
    case fileSmile = "\u{FD24}"
    /// file-spark
    case fileSpark = "\u{FFB9}"
    /// file-spreadsheet
    case fileSpreadsheet = "\u{F03E}"
    /// file-stack
    case fileStack = "\u{F503}"
    /// file-star
    case fileStar = "\u{F03F}"
    /// file-symlink
    case fileSymlink = "\u{ED53}"
    /// file-text
    case fileText = "\u{EAA2}"
    /// file-text-ai
    case fileTextAi = "\u{FA27}"
    /// file-text-shield
    case fileTextShield = "\u{100F2}"
    /// file-text-spark
    case fileTextSpark = "\u{FFB8}"
    /// file-time
    case fileTime = "\u{F040}"
    /// file-type-bmp
    case fileTypeBmp = "\u{FB07}"
    /// file-type-css
    case fileTypeCss = "\u{FB08}"
    /// file-type-csv
    case fileTypeCsv = "\u{FB09}"
    /// file-type-doc
    case fileTypeDoc = "\u{FB0A}"
    /// file-type-docx
    case fileTypeDocx = "\u{FB0B}"
    /// file-type-html
    case fileTypeHtml = "\u{FB0C}"
    /// file-type-jpg
    case fileTypeJpg = "\u{FB0D}"
    /// file-type-js
    case fileTypeJs = "\u{FB0E}"
    /// file-type-jsx
    case fileTypeJsx = "\u{FB0F}"
    /// file-type-pdf
    case fileTypePdf = "\u{FB10}"
    /// file-type-php
    case fileTypePhp = "\u{FB11}"
    /// file-type-png
    case fileTypePng = "\u{FB12}"
    /// file-type-ppt
    case fileTypePpt = "\u{FB13}"
    /// file-type-rs
    case fileTypeRs = "\u{FB14}"
    /// file-type-sql
    case fileTypeSql = "\u{FB15}"
    /// file-type-svg
    case fileTypeSvg = "\u{FB16}"
    /// file-type-ts
    case fileTypeTs = "\u{FB17}"
    /// file-type-tsx
    case fileTypeTsx = "\u{FB18}"
    /// file-type-txt
    case fileTypeTxt = "\u{FB19}"
    /// file-type-vue
    case fileTypeVue = "\u{FB1A}"
    /// file-type-xls
    case fileTypeXls = "\u{FB1B}"
    /// file-type-xml
    case fileTypeXml = "\u{FB1C}"
    /// file-type-zip
    case fileTypeZip = "\u{FB1D}"
    /// file-typography
    case fileTypography = "\u{F041}"
    /// file-unknown
    case fileUnknown = "\u{F042}"
    /// file-upload
    case fileUpload = "\u{EC91}"
    /// file-vector
    case fileVector = "\u{F043}"
    /// file-word
    case fileWord = "\u{FEF2}"
    /// file-x
    case fileX = "\u{EAA3}"
    /// file-zip
    case fileZip = "\u{ED4E}"
    /// files
    case files = "\u{EDEF}"
    /// files-off
    case filesOff = "\u{EDEE}"
    /// filter
    case filter = "\u{EAA5}"
    /// filter-2
    case filter2 = "\u{1014B}"
    /// filter-2-bolt
    case filter2Bolt = "\u{1015F}"
    /// filter-2-cancel
    case filter2Cancel = "\u{1015E}"
    /// filter-2-check
    case filter2Check = "\u{1015D}"
    /// filter-2-code
    case filter2Code = "\u{1015C}"
    /// filter-2-cog
    case filter2Cog = "\u{1015B}"
    /// filter-2-discount
    case filter2Discount = "\u{1015A}"
    /// filter-2-dollar
    case filter2Dollar = "\u{10159}"
    /// filter-2-down
    case filter2Down = "\u{10158}"
    /// filter-2-edit
    case filter2Edit = "\u{10157}"
    /// filter-2-exclamation
    case filter2Exclamation = "\u{10156}"
    /// filter-2-minus
    case filter2Minus = "\u{10155}"
    /// filter-2-pause
    case filter2Pause = "\u{10154}"
    /// filter-2-pin
    case filter2Pin = "\u{10153}"
    /// filter-2-plus
    case filter2Plus = "\u{10152}"
    /// filter-2-question
    case filter2Question = "\u{10151}"
    /// filter-2-search
    case filter2Search = "\u{10150}"
    /// filter-2-share
    case filter2Share = "\u{1014F}"
    /// filter-2-spark
    case filter2Spark = "\u{1014E}"
    /// filter-2-up
    case filter2Up = "\u{1014D}"
    /// filter-2-x
    case filter2X = "\u{1014C}"
    /// filter-bolt
    case filterBolt = "\u{FB7C}"
    /// filter-cancel
    case filterCancel = "\u{FB7D}"
    /// filter-check
    case filterCheck = "\u{FB7E}"
    /// filter-code
    case filterCode = "\u{FB7F}"
    /// filter-cog
    case filterCog = "\u{F9FE}"
    /// filter-discount
    case filterDiscount = "\u{FB80}"
    /// filter-dollar
    case filterDollar = "\u{F9FF}"
    /// filter-down
    case filterDown = "\u{FB81}"
    /// filter-edit
    case filterEdit = "\u{FA00}"
    /// filter-exclamation
    case filterExclamation = "\u{FB82}"
    /// filter-heart
    case filterHeart = "\u{FB83}"
    /// filter-minus
    case filterMinus = "\u{FA01}"
    /// filter-off
    case filterOff = "\u{ED2C}"
    /// filter-pause
    case filterPause = "\u{FB84}"
    /// filter-pin
    case filterPin = "\u{FB85}"
    /// filter-plus
    case filterPlus = "\u{FA02}"
    /// filter-question
    case filterQuestion = "\u{FB86}"
    /// filter-search
    case filterSearch = "\u{FB87}"
    /// filter-share
    case filterShare = "\u{FB88}"
    /// filter-spark
    case filterSpark = "\u{1014A}"
    /// filter-star
    case filterStar = "\u{FA03}"
    /// filter-up
    case filterUp = "\u{FB89}"
    /// filter-x
    case filterX = "\u{FA04}"
    /// filters
    case filters = "\u{F793}"
    /// fingerprint
    case fingerprint = "\u{EBD1}"
    /// fingerprint-off
    case fingerprintOff = "\u{F12A}"
    /// fingerprint-scan
    case fingerprintScan = "\u{FCB5}"
    /// fire-extinguisher
    case fireExtinguisher = "\u{FAF6}"
    /// fire-hydrant
    case fireHydrant = "\u{F3A9}"
    /// fire-hydrant-off
    case fireHydrantOff = "\u{F3EC}"
    /// firetruck
    case firetruck = "\u{EBE8}"
    /// first-aid-kit
    case firstAidKit = "\u{EF5F}"
    /// first-aid-kit-off
    case firstAidKitOff = "\u{F3ED}"
    /// fish
    case fish = "\u{EF2B}"
    /// fish-bone
    case fishBone = "\u{F287}"
    /// fish-christianity
    case fishChristianity = "\u{F58B}"
    /// fish-hook
    case fishHook = "\u{F1F9}"
    /// fish-hook-off
    case fishHookOff = "\u{F3EE}"
    /// fish-off
    case fishOff = "\u{F12B}"
    /// flag
    case flag = "\u{EAA6}"
    /// flag-2
    case flag2 = "\u{EE8C}"
    /// flag-2-off
    case flag2Off = "\u{F12C}"
    /// flag-3
    case flag3 = "\u{EE8D}"
    /// flag-bitcoin
    case flagBitcoin = "\u{FF3C}"
    /// flag-bolt
    case flagBolt = "\u{FB8A}"
    /// flag-cancel
    case flagCancel = "\u{FB8B}"
    /// flag-check
    case flagCheck = "\u{FB8C}"
    /// flag-code
    case flagCode = "\u{FB8D}"
    /// flag-cog
    case flagCog = "\u{FB8E}"
    /// flag-discount
    case flagDiscount = "\u{FB8F}"
    /// flag-dollar
    case flagDollar = "\u{FB90}"
    /// flag-down
    case flagDown = "\u{FB91}"
    /// flag-exclamation
    case flagExclamation = "\u{FB92}"
    /// flag-heart
    case flagHeart = "\u{FB93}"
    /// flag-minus
    case flagMinus = "\u{FB94}"
    /// flag-off
    case flagOff = "\u{F12D}"
    /// flag-pause
    case flagPause = "\u{FB95}"
    /// flag-pin
    case flagPin = "\u{FB96}"
    /// flag-plus
    case flagPlus = "\u{FB97}"
    /// flag-question
    case flagQuestion = "\u{FB98}"
    /// flag-search
    case flagSearch = "\u{FB99}"
    /// flag-share
    case flagShare = "\u{FB9A}"
    /// flag-spark
    case flagSpark = "\u{FFB7}"
    /// flag-star
    case flagStar = "\u{FB9B}"
    /// flag-up
    case flagUp = "\u{FB9C}"
    /// flag-x
    case flagX = "\u{FB9D}"
    /// flame
    case flame = "\u{EC2C}"
    /// flame-off
    case flameOff = "\u{F12E}"
    /// flare
    case flare = "\u{EE8E}"
    /// flask
    case flask = "\u{EBD2}"
    /// flask-2
    case flask2 = "\u{EF60}"
    /// flask-2-off
    case flask2Off = "\u{F12F}"
    /// flask-off
    case flaskOff = "\u{F130}"
    /// flip-flops
    case flipFlops = "\u{F564}"
    /// flip-horizontal
    case flipHorizontal = "\u{EAA7}"
    /// flip-vertical
    case flipVertical = "\u{EAA8}"
    /// float-center
    case floatCenter = "\u{EBB1}"
    /// float-left
    case floatLeft = "\u{EBB2}"
    /// float-none
    case floatNone = "\u{ED13}"
    /// float-right
    case floatRight = "\u{EBB3}"
    /// flower
    case flower = "\u{EFF6}"
    /// flower-off
    case flowerOff = "\u{F131}"
    /// focus
    case focus = "\u{EB8D}"
    /// focus-2
    case focus2 = "\u{EBD3}"
    /// focus-auto
    case focusAuto = "\u{FA62}"
    /// focus-centered
    case focusCentered = "\u{F02A}"
    /// fold
    case fold = "\u{ED56}"
    /// fold-down
    case foldDown = "\u{ED54}"
    /// fold-up
    case foldUp = "\u{ED55}"
    /// folder
    case folder = "\u{EAAD}"
    /// folder-bolt
    case folderBolt = "\u{F90C}"
    /// folder-cancel
    case folderCancel = "\u{F90D}"
    /// folder-check
    case folderCheck = "\u{F90E}"
    /// folder-code
    case folderCode = "\u{F90F}"
    /// folder-cog
    case folderCog = "\u{F910}"
    /// folder-dollar
    case folderDollar = "\u{F911}"
    /// folder-down
    case folderDown = "\u{F912}"
    /// folder-exclamation
    case folderExclamation = "\u{F913}"
    /// folder-heart
    case folderHeart = "\u{F914}"
    /// folder-minus
    case folderMinus = "\u{EAAA}"
    /// folder-off
    case folderOff = "\u{ED14}"
    /// folder-open
    case folderOpen = "\u{FAF7}"
    /// folder-pause
    case folderPause = "\u{F915}"
    /// folder-pin
    case folderPin = "\u{F916}"
    /// folder-plus
    case folderPlus = "\u{EAAB}"
    /// folder-question
    case folderQuestion = "\u{F917}"
    /// folder-root
    case folderRoot = "\u{FD43}"
    /// folder-search
    case folderSearch = "\u{F918}"
    /// folder-share
    case folderShare = "\u{F919}"
    /// folder-star
    case folderStar = "\u{F91A}"
    /// folder-symlink
    case folderSymlink = "\u{F91B}"
    /// folder-up
    case folderUp = "\u{F91C}"
    /// folder-x
    case folderX = "\u{EAAC}"
    /// folders
    case folders = "\u{EAAE}"
    /// folders-off
    case foldersOff = "\u{F133}"
    /// forbid
    case forbid = "\u{EBD5}"
    /// forbid-2
    case forbid2 = "\u{EBD4}"
    /// forklift
    case forklift = "\u{EBE9}"
    /// forms
    case forms = "\u{EE8F}"
    /// fountain
    case fountain = "\u{F09B}"
    /// fountain-off
    case fountainOff = "\u{F134}"
    /// frame
    case frame = "\u{EAAF}"
    /// frame-off
    case frameOff = "\u{F135}"
    /// free-rights
    case freeRights = "\u{EFB6}"
    /// freeze-column
    case freezeColumn = "\u{FA63}"
    /// freeze-row
    case freezeRow = "\u{FA65}"
    /// freeze-row-column
    case freezeRowColumn = "\u{FA64}"
    /// fridge
    case fridge = "\u{F1FA}"
    /// fridge-off
    case fridgeOff = "\u{F3EF}"
    /// friends
    case friends = "\u{EAB0}"
    /// friends-off
    case friendsOff = "\u{F136}"
    /// frustum
    case frustum = "\u{FA9F}"
    /// frustum-off
    case frustumOff = "\u{FA9D}"
    /// frustum-plus
    case frustumPlus = "\u{FA9E}"
    /// function
    case function = "\u{F225}"
    /// function-off
    case functionOff = "\u{F3F0}"
    /// galaxy
    case galaxy = "\u{FCB6}"
    /// garden-cart
    case gardenCart = "\u{F23E}"
    /// garden-cart-off
    case gardenCartOff = "\u{F3F1}"
    /// gas-station
    case gasStation = "\u{EC7D}"
    /// gas-station-off
    case gasStationOff = "\u{F137}"
    /// gauge
    case gauge = "\u{EAB1}"
    /// gauge-off
    case gaugeOff = "\u{F138}"
    /// gavel
    case gavel = "\u{EF90}"
    /// gender-agender
    case genderAgender = "\u{F0E1}"
    /// gender-androgyne
    case genderAndrogyne = "\u{F0E2}"
    /// gender-bigender
    case genderBigender = "\u{F0E3}"
    /// gender-demiboy
    case genderDemiboy = "\u{F0E4}"
    /// gender-demigirl
    case genderDemigirl = "\u{F0E5}"
    /// gender-epicene
    case genderEpicene = "\u{F0E6}"
    /// gender-female
    case genderFemale = "\u{F0E7}"
    /// gender-femme
    case genderFemme = "\u{F0E8}"
    /// gender-genderfluid
    case genderGenderfluid = "\u{F0E9}"
    /// gender-genderless
    case genderGenderless = "\u{F0EA}"
    /// gender-genderqueer
    case genderGenderqueer = "\u{F0EB}"
    /// gender-hermaphrodite
    case genderHermaphrodite = "\u{F0EC}"
    /// gender-intergender
    case genderIntergender = "\u{F0ED}"
    /// gender-male
    case genderMale = "\u{F0EE}"
    /// gender-neutrois
    case genderNeutrois = "\u{F0EF}"
    /// gender-third
    case genderThird = "\u{F0F0}"
    /// gender-transgender
    case genderTransgender = "\u{F0F1}"
    /// gender-trasvesti
    case genderTrasvesti = "\u{F0F2}"
    /// geometry
    case geometry = "\u{EE90}"
    /// ghost
    case ghost = "\u{EB8E}"
    /// ghost-2
    case ghost2 = "\u{F57C}"
    /// ghost-3
    case ghost3 = "\u{FC13}"
    /// ghost-off
    case ghostOff = "\u{F3F2}"
    /// gif
    case gif = "\u{F257}"
    /// gift
    case gift = "\u{EB68}"
    /// gift-card
    case giftCard = "\u{F3AA}"
    /// gift-off
    case giftOff = "\u{F3F3}"
    /// git-branch
    case gitBranch = "\u{EAB2}"
    /// git-branch-deleted
    case gitBranchDeleted = "\u{F57D}"
    /// git-cherry-pick
    case gitCherryPick = "\u{F57E}"
    /// git-commit
    case gitCommit = "\u{EAB3}"
    /// git-compare
    case gitCompare = "\u{EAB4}"
    /// git-fork
    case gitFork = "\u{EB8F}"
    /// git-merge
    case gitMerge = "\u{EAB5}"
    /// git-pull-request
    case gitPullRequest = "\u{EAB6}"
    /// git-pull-request-closed
    case gitPullRequestClosed = "\u{EF7F}"
    /// git-pull-request-draft
    case gitPullRequestDraft = "\u{EFB7}"
    /// gizmo
    case gizmo = "\u{F02B}"
    /// glass
    case glass = "\u{EAB8}"
    /// glass-champagne
    case glassChampagne = "\u{FD9C}"
    /// glass-cocktail
    case glassCocktail = "\u{FD9D}"
    /// glass-full
    case glassFull = "\u{EAB7}"
    /// glass-gin
    case glassGin = "\u{FD9E}"
    /// glass-off
    case glassOff = "\u{EE91}"
    /// globe
    case globe = "\u{EAB9}"
    /// globe-off
    case globeOff = "\u{F139}"
    /// go-game
    case goGame = "\u{F512}"
    /// golf
    case golf = "\u{ED8C}"
    /// golf-off
    case golfOff = "\u{F13A}"
    /// gps
    case gps = "\u{ED7A}"
    /// gradienter
    case gradienter = "\u{F3AB}"
    /// grain
    case grain = "\u{EE92}"
    /// graph
    case graph = "\u{F288}"
    /// graph-off
    case graphOff = "\u{F3F4}"
    /// grave
    case grave = "\u{F580}"
    /// grave-2
    case grave2 = "\u{F57F}"
    /// grid-3x3
    case grid3x3 = "\u{FCA4}"
    /// grid-4x4
    case grid4x4 = "\u{FCA5}"
    /// grid-dots
    case gridDots = "\u{EABA}"
    /// grid-goldenratio
    case gridGoldenratio = "\u{FCA6}"
    /// grid-pattern
    case gridPattern = "\u{EFC9}"
    /// grid-scan
    case gridScan = "\u{FCA7}"
    /// grill
    case grill = "\u{EFA9}"
    /// grill-fork
    case grillFork = "\u{F35B}"
    /// grill-off
    case grillOff = "\u{F3F5}"
    /// grill-spatula
    case grillSpatula = "\u{F35C}"
    /// grip-horizontal
    case gripHorizontal = "\u{EC00}"
    /// grip-vertical
    case gripVertical = "\u{EC01}"
    /// growth
    case growth = "\u{EE93}"
    /// guitar-pick
    case guitarPick = "\u{F4C6}"
    /// gymnastics
    case gymnastics = "\u{FD44}"
    /// h-1
    case h1 = "\u{EC94}"
    /// h-2
    case h2 = "\u{EC95}"
    /// h-3
    case h3 = "\u{EC96}"
    /// h-4
    case h4 = "\u{EC97}"
    /// h-5
    case h5 = "\u{EC98}"
    /// h-6
    case h6 = "\u{EC99}"
    /// hammer
    case hammer = "\u{EF91}"
    /// hammer-off
    case hammerOff = "\u{F13C}"
    /// hand-click
    case handClick = "\u{EF4F}"
    /// hand-click-off
    case handClickOff = "\u{100F1}"
    /// hand-finger
    case handFinger = "\u{EE94}"
    /// hand-finger-down
    case handFingerDown = "\u{FF4F}"
    /// hand-finger-left
    case handFingerLeft = "\u{FF4E}"
    /// hand-finger-off
    case handFingerOff = "\u{F13D}"
    /// hand-finger-right
    case handFingerRight = "\u{FF4D}"
    /// hand-grab
    case handGrab = "\u{F091}"
    /// hand-little-finger
    case handLittleFinger = "\u{EE95}"
    /// hand-love-you
    case handLoveYou = "\u{EE97}"
    /// hand-middle-finger
    case handMiddleFinger = "\u{EC2D}"
    /// hand-move
    case handMove = "\u{EF50}"
    /// hand-off
    case handOff = "\u{ED15}"
    /// hand-ring-finger
    case handRingFinger = "\u{EE96}"
    /// hand-sanitizer
    case handSanitizer = "\u{F5F4}"
    /// hand-stop
    case handStop = "\u{EC2E}"
    /// hand-three-fingers
    case handThreeFingers = "\u{EE98}"
    /// hand-two-fingers
    case handTwoFingers = "\u{EE99}"
    /// hanger
    case hanger = "\u{EE9A}"
    /// hanger-2
    case hanger2 = "\u{F09C}"
    /// hanger-off
    case hangerOff = "\u{F13E}"
    /// hash
    case hash = "\u{EABC}"
    /// haze
    case haze = "\u{EFAA}"
    /// haze-moon
    case hazeMoon = "\u{FAF8}"
    /// hdr
    case hdr = "\u{FA7B}"
    /// heading
    case heading = "\u{EE9B}"
    /// heading-off
    case headingOff = "\u{F13F}"
    /// headphones
    case headphones = "\u{EABD}"
    /// headphones-off
    case headphonesOff = "\u{ED1D}"
    /// headset
    case headset = "\u{EB90}"
    /// headset-off
    case headsetOff = "\u{F3F6}"
    /// health-recognition
    case healthRecognition = "\u{F1FB}"
    /// heart
    case heart = "\u{EABE}"
    /// heart-bitcoin
    case heartBitcoin = "\u{FF3B}"
    /// heart-bolt
    case heartBolt = "\u{FB9E}"
    /// heart-broken
    case heartBroken = "\u{ECBA}"
    /// heart-cancel
    case heartCancel = "\u{FB9F}"
    /// heart-check
    case heartCheck = "\u{FBA0}"
    /// heart-code
    case heartCode = "\u{FBA1}"
    /// heart-cog
    case heartCog = "\u{FBA2}"
    /// heart-discount
    case heartDiscount = "\u{FBA3}"
    /// heart-dollar
    case heartDollar = "\u{FBA4}"
    /// heart-down
    case heartDown = "\u{FBA5}"
    /// heart-exclamation
    case heartExclamation = "\u{FBA6}"
    /// heart-handshake
    case heartHandshake = "\u{F0F3}"
    /// heart-minus
    case heartMinus = "\u{F140}"
    /// heart-off
    case heartOff = "\u{F141}"
    /// heart-pause
    case heartPause = "\u{FBA7}"
    /// heart-pin
    case heartPin = "\u{FBA8}"
    /// heart-plus
    case heartPlus = "\u{F142}"
    /// heart-question
    case heartQuestion = "\u{FBA9}"
    /// heart-rate-monitor
    case heartRateMonitor = "\u{EF61}"
    /// heart-search
    case heartSearch = "\u{FBAA}"
    /// heart-share
    case heartShare = "\u{FBAB}"
    /// heart-spark
    case heartSpark = "\u{FFB6}"
    /// heart-star
    case heartStar = "\u{FBAC}"
    /// heart-up
    case heartUp = "\u{FBAD}"
    /// heart-x
    case heartX = "\u{FBAE}"
    /// heartbeat
    case heartbeat = "\u{EF92}"
    /// hearts
    case hearts = "\u{F387}"
    /// hearts-off
    case heartsOff = "\u{F3F7}"
    /// helicopter
    case helicopter = "\u{ED8E}"
    /// helicopter-landing
    case helicopterLanding = "\u{ED8D}"
    /// helmet
    case helmet = "\u{EFCA}"
    /// helmet-off
    case helmetOff = "\u{F143}"
    /// help
    case help = "\u{EABF}"
    /// help-circle
    case helpCircle = "\u{F91D}"
    /// help-hexagon
    case helpHexagon = "\u{F7A8}"
    /// help-octagon
    case helpOctagon = "\u{F7A9}"
    /// help-off
    case helpOff = "\u{F3F8}"
    /// help-small
    case helpSmall = "\u{F91E}"
    /// help-square
    case helpSquare = "\u{F920}"
    /// help-square-rounded
    case helpSquareRounded = "\u{F91F}"
    /// help-triangle
    case helpTriangle = "\u{F921}"
    /// hemisphere
    case hemisphere = "\u{FAA2}"
    /// hemisphere-off
    case hemisphereOff = "\u{FAA0}"
    /// hemisphere-plus
    case hemispherePlus = "\u{FAA1}"
    /// hexagon
    case hexagon = "\u{EC02}"
    /// hexagon-3d
    case hexagon3d = "\u{F4C7}"
    /// hexagon-asterisk
    case hexagonAsterisk = "\u{101AB}"
    /// hexagon-letter-a
    case hexagonLetterA = "\u{F463}"
    /// hexagon-letter-b
    case hexagonLetterB = "\u{F464}"
    /// hexagon-letter-c
    case hexagonLetterC = "\u{F465}"
    /// hexagon-letter-d
    case hexagonLetterD = "\u{F466}"
    /// hexagon-letter-e
    case hexagonLetterE = "\u{F467}"
    /// hexagon-letter-f
    case hexagonLetterF = "\u{F468}"
    /// hexagon-letter-g
    case hexagonLetterG = "\u{F469}"
    /// hexagon-letter-h
    case hexagonLetterH = "\u{F46A}"
    /// hexagon-letter-i
    case hexagonLetterI = "\u{F46B}"
    /// hexagon-letter-j
    case hexagonLetterJ = "\u{F46C}"
    /// hexagon-letter-k
    case hexagonLetterK = "\u{F46D}"
    /// hexagon-letter-l
    case hexagonLetterL = "\u{F46E}"
    /// hexagon-letter-m
    case hexagonLetterM = "\u{F46F}"
    /// hexagon-letter-n
    case hexagonLetterN = "\u{F470}"
    /// hexagon-letter-o
    case hexagonLetterO = "\u{F471}"
    /// hexagon-letter-p
    case hexagonLetterP = "\u{F472}"
    /// hexagon-letter-q
    case hexagonLetterQ = "\u{F473}"
    /// hexagon-letter-r
    case hexagonLetterR = "\u{F474}"
    /// hexagon-letter-s
    case hexagonLetterS = "\u{F475}"
    /// hexagon-letter-t
    case hexagonLetterT = "\u{F476}"
    /// hexagon-letter-u
    case hexagonLetterU = "\u{F477}"
    /// hexagon-letter-v
    case hexagonLetterV = "\u{F4B3}"
    /// hexagon-letter-w
    case hexagonLetterW = "\u{F478}"
    /// hexagon-letter-x
    case hexagonLetterX = "\u{F479}"
    /// hexagon-letter-y
    case hexagonLetterY = "\u{F47A}"
    /// hexagon-letter-z
    case hexagonLetterZ = "\u{F47B}"
    /// hexagon-minus
    case hexagonMinus = "\u{FC8F}"
    /// hexagon-minus-2
    case hexagonMinus2 = "\u{FC8E}"
    /// hexagon-number-0
    case hexagonNumber0 = "\u{F459}"
    /// hexagon-number-1
    case hexagonNumber1 = "\u{F45A}"
    /// hexagon-number-2
    case hexagonNumber2 = "\u{F45B}"
    /// hexagon-number-3
    case hexagonNumber3 = "\u{F45C}"
    /// hexagon-number-4
    case hexagonNumber4 = "\u{F45D}"
    /// hexagon-number-5
    case hexagonNumber5 = "\u{F45E}"
    /// hexagon-number-6
    case hexagonNumber6 = "\u{F45F}"
    /// hexagon-number-7
    case hexagonNumber7 = "\u{F460}"
    /// hexagon-number-8
    case hexagonNumber8 = "\u{F461}"
    /// hexagon-number-9
    case hexagonNumber9 = "\u{F462}"
    /// hexagon-off
    case hexagonOff = "\u{EE9C}"
    /// hexagon-plus
    case hexagonPlus = "\u{FC45}"
    /// hexagon-plus-2
    case hexagonPlus2 = "\u{FC90}"
    /// hexagonal-prism
    case hexagonalPrism = "\u{FAA5}"
    /// hexagonal-prism-off
    case hexagonalPrismOff = "\u{FAA3}"
    /// hexagonal-prism-plus
    case hexagonalPrismPlus = "\u{FAA4}"
    /// hexagonal-pyramid
    case hexagonalPyramid = "\u{FAA8}"
    /// hexagonal-pyramid-off
    case hexagonalPyramidOff = "\u{FAA6}"
    /// hexagonal-pyramid-plus
    case hexagonalPyramidPlus = "\u{FAA7}"
    /// hexagons
    case hexagons = "\u{F09D}"
    /// hexagons-off
    case hexagonsOff = "\u{F3F9}"
    /// hierarchy
    case hierarchy = "\u{EE9E}"
    /// hierarchy-2
    case hierarchy2 = "\u{EE9D}"
    /// hierarchy-3
    case hierarchy3 = "\u{F289}"
    /// hierarchy-off
    case hierarchyOff = "\u{F3FA}"
    /// highlight
    case highlight = "\u{EF3F}"
    /// highlight-off
    case highlightOff = "\u{F144}"
    /// history
    case history = "\u{EBEA}"
    /// history-off
    case historyOff = "\u{F3FB}"
    /// history-toggle
    case historyToggle = "\u{F1FC}"
    /// home
    case home = "\u{EAC1}"
    /// home-2
    case home2 = "\u{EAC0}"
    /// home-bitcoin
    case homeBitcoin = "\u{FF3A}"
    /// home-bolt
    case homeBolt = "\u{F336}"
    /// home-cancel
    case homeCancel = "\u{F350}"
    /// home-check
    case homeCheck = "\u{F337}"
    /// home-cog
    case homeCog = "\u{F338}"
    /// home-dollar
    case homeDollar = "\u{F339}"
    /// home-dot
    case homeDot = "\u{F33A}"
    /// home-down
    case homeDown = "\u{F33B}"
    /// home-eco
    case homeEco = "\u{F351}"
    /// home-edit
    case homeEdit = "\u{F352}"
    /// home-exclamation
    case homeExclamation = "\u{F33C}"
    /// home-hand
    case homeHand = "\u{F504}"
    /// home-heart
    case homeHeart = "\u{F353}"
    /// home-infinity
    case homeInfinity = "\u{F505}"
    /// home-link
    case homeLink = "\u{F354}"
    /// home-minus
    case homeMinus = "\u{F33D}"
    /// home-move
    case homeMove = "\u{F33E}"
    /// home-off
    case homeOff = "\u{F145}"
    /// home-plus
    case homePlus = "\u{F33F}"
    /// home-question
    case homeQuestion = "\u{F340}"
    /// home-ribbon
    case homeRibbon = "\u{F355}"
    /// home-search
    case homeSearch = "\u{F341}"
    /// home-share
    case homeShare = "\u{F342}"
    /// home-shield
    case homeShield = "\u{F343}"
    /// home-signal
    case homeSignal = "\u{F356}"
    /// home-spark
    case homeSpark = "\u{FFB5}"
    /// home-star
    case homeStar = "\u{F344}"
    /// home-stats
    case homeStats = "\u{F345}"
    /// home-up
    case homeUp = "\u{F346}"
    /// home-x
    case homeX = "\u{F347}"
    /// horse
    case horse = "\u{FC46}"
    /// horse-toy
    case horseToy = "\u{F28A}"
    /// horseshoe
    case horseshoe = "\u{FCB7}"
    /// hospital
    case hospital = "\u{FD59}"
    /// hospital-circle
    case hospitalCircle = "\u{FD58}"
    /// hotel-service
    case hotelService = "\u{EF80}"
    /// hourglass
    case hourglass = "\u{EF93}"
    /// hourglass-empty
    case hourglassEmpty = "\u{F146}"
    /// hourglass-high
    case hourglassHigh = "\u{F092}"
    /// hourglass-low
    case hourglassLow = "\u{F093}"
    /// hourglass-off
    case hourglassOff = "\u{F147}"
    /// hours-12
    case hours12 = "\u{FC53}"
    /// hours-24
    case hours24 = "\u{F5E7}"
    /// html
    case html = "\u{F7B1}"
    /// http-connect
    case httpConnect = "\u{FA28}"
    /// http-connect-off
    case httpConnectOff = "\u{100E7}"
    /// http-delete
    case httpDelete = "\u{FA29}"
    /// http-delete-off
    case httpDeleteOff = "\u{100E6}"
    /// http-get
    case httpGet = "\u{FA2A}"
    /// http-get-off
    case httpGetOff = "\u{100E5}"
    /// http-head
    case httpHead = "\u{FA2B}"
    /// http-head-off
    case httpHeadOff = "\u{100E4}"
    /// http-options
    case httpOptions = "\u{FA2C}"
    /// http-options-off
    case httpOptionsOff = "\u{100E3}"
    /// http-patch
    case httpPatch = "\u{FA2D}"
    /// http-patch-off
    case httpPatchOff = "\u{100E2}"
    /// http-post
    case httpPost = "\u{FA2E}"
    /// http-post-off
    case httpPostOff = "\u{100E1}"
    /// http-put
    case httpPut = "\u{FA2F}"
    /// http-put-off
    case httpPutOff = "\u{100E0}"
    /// http-que
    case httpQue = "\u{FA5B}"
    /// http-que-off
    case httpQueOff = "\u{100DF}"
    /// http-trace
    case httpTrace = "\u{FA30}"
    /// http-trace-off
    case httpTraceOff = "\u{100DE}"
    /// ice-cream
    case iceCream = "\u{EAC2}"
    /// ice-cream-2
    case iceCream2 = "\u{EE9F}"
    /// ice-cream-off
    case iceCreamOff = "\u{F148}"
    /// ice-skating
    case iceSkating = "\u{EFCB}"
    /// icons
    case icons = "\u{F1D4}"
    /// icons-off
    case iconsOff = "\u{F3FC}"
    /// id
    case id = "\u{EAC3}"
    /// id-badge
    case idBadge = "\u{EFF7}"
    /// id-badge-2
    case idBadge2 = "\u{F076}"
    /// id-badge-off
    case idBadgeOff = "\u{F3FD}"
    /// id-off
    case idOff = "\u{F149}"
    /// ikosaedr
    case ikosaedr = "\u{FEC6}"
    /// image-in-picture
    case imageInPicture = "\u{FD9F}"
    /// inbox
    case inbox = "\u{EAC4}"
    /// inbox-off
    case inboxOff = "\u{F14A}"
    /// indent-decrease
    case indentDecrease = "\u{EB91}"
    /// indent-increase
    case indentIncrease = "\u{EB92}"
    /// infinity
    case infinity = "\u{EB69}"
    /// infinity-off
    case infinityOff = "\u{F3FE}"
    /// info-circle
    case infoCircle = "\u{EAC5}"
    /// info-hexagon
    case infoHexagon = "\u{F7AA}"
    /// info-octagon
    case infoOctagon = "\u{F7AB}"
    /// info-small
    case infoSmall = "\u{F922}"
    /// info-square
    case infoSquare = "\u{EAC6}"
    /// info-square-rounded
    case infoSquareRounded = "\u{F635}"
    /// info-triangle
    case infoTriangle = "\u{F923}"
    /// inner-shadow-bottom
    case innerShadowBottom = "\u{F520}"
    /// inner-shadow-bottom-left
    case innerShadowBottomLeft = "\u{F51E}"
    /// inner-shadow-bottom-right
    case innerShadowBottomRight = "\u{F51F}"
    /// inner-shadow-left
    case innerShadowLeft = "\u{F521}"
    /// inner-shadow-right
    case innerShadowRight = "\u{F522}"
    /// inner-shadow-top
    case innerShadowTop = "\u{F525}"
    /// inner-shadow-top-left
    case innerShadowTopLeft = "\u{F523}"
    /// inner-shadow-top-right
    case innerShadowTopRight = "\u{F524}"
    /// input-ai
    case inputAi = "\u{FC5A}"
    /// input-check
    case inputCheck = "\u{FC5B}"
    /// input-search
    case inputSearch = "\u{F2A2}"
    /// input-spark
    case inputSpark = "\u{FFB4}"
    /// input-x
    case inputX = "\u{FC5C}"
    /// invoice
    case invoice = "\u{FEAB}"
    /// ironing
    case ironing = "\u{FA7C}"
    /// ironing-1
    case ironing1 = "\u{F2F4}"
    /// ironing-2
    case ironing2 = "\u{F2F5}"
    /// ironing-3
    case ironing3 = "\u{F2F6}"
    /// ironing-off
    case ironingOff = "\u{F2F7}"
    /// ironing-steam
    case ironingSteam = "\u{F2F9}"
    /// ironing-steam-off
    case ironingSteamOff = "\u{F2F8}"
    /// irregular-polyhedron
    case irregularPolyhedron = "\u{FAAB}"
    /// irregular-polyhedron-off
    case irregularPolyhedronOff = "\u{FAA9}"
    /// irregular-polyhedron-plus
    case irregularPolyhedronPlus = "\u{FAAA}"
    /// italic
    case italic = "\u{EB93}"
    /// jacket
    case jacket = "\u{F661}"
    /// jetpack
    case jetpack = "\u{F581}"
    /// jewish-star
    case jewishStar = "\u{F3FF}"
    /// join-bevel
    case joinBevel = "\u{FF4C}"
    /// join-round
    case joinRound = "\u{FF4B}"
    /// join-straight
    case joinStraight = "\u{FF4A}"
    /// joker
    case joker = "\u{1005F}"
    /// jpg
    case jpg = "\u{F3AC}"
    /// json
    case json = "\u{F7B2}"
    /// jump-rope
    case jumpRope = "\u{ED8F}"
    /// karate
    case karate = "\u{ED32}"
    /// kayak
    case kayak = "\u{F1D6}"
    /// kerning
    case kerning = "\u{EFB8}"
    /// key
    case key = "\u{EAC7}"
    /// key-off
    case keyOff = "\u{F14B}"
    /// keyboard
    case keyboard = "\u{EBD6}"
    /// keyboard-hide
    case keyboardHide = "\u{EC7E}"
    /// keyboard-off
    case keyboardOff = "\u{EEA0}"
    /// keyboard-show
    case keyboardShow = "\u{EC7F}"
    /// keyframe
    case keyframe = "\u{F576}"
    /// keyframe-align-center
    case keyframeAlignCenter = "\u{F582}"
    /// keyframe-align-horizontal
    case keyframeAlignHorizontal = "\u{F583}"
    /// keyframe-align-vertical
    case keyframeAlignVertical = "\u{F584}"
    /// keyframes
    case keyframes = "\u{F585}"
    /// label
    case label = "\u{FF38}"
    /// label-important
    case labelImportant = "\u{FF49}"
    /// label-off
    case labelOff = "\u{FF39}"
    /// ladder
    case ladder = "\u{EFE2}"
    /// ladder-off
    case ladderOff = "\u{F14C}"
    /// ladle
    case ladle = "\u{FC14}"
    /// lambda
    case lambda = "\u{F541}"
    /// lamp
    case lamp = "\u{EFAB}"
    /// lamp-2
    case lamp2 = "\u{F09E}"
    /// lamp-off
    case lampOff = "\u{F14D}"
    /// lane
    case lane = "\u{FAF9}"
    /// language
    case language = "\u{EBBE}"
    /// language-hiragana
    case languageHiragana = "\u{EF77}"
    /// language-katakana
    case languageKatakana = "\u{EF78}"
    /// language-off
    case languageOff = "\u{F14E}"
    /// lasso
    case lasso = "\u{EFAC}"
    /// lasso-off
    case lassoOff = "\u{F14F}"
    /// lasso-polygon
    case lassoPolygon = "\u{F388}"
    /// laurel-wreath
    case laurelWreath = "\u{FF45}"
    /// laurel-wreath-1
    case laurelWreath1 = "\u{FF48}"
    /// laurel-wreath-2
    case laurelWreath2 = "\u{FF47}"
    /// laurel-wreath-3
    case laurelWreath3 = "\u{FF46}"
    /// layers-difference
    case layersDifference = "\u{EAC8}"
    /// layers-intersect
    case layersIntersect = "\u{EAC9}"
    /// layers-intersect-2
    case layersIntersect2 = "\u{EFF8}"
    /// layers-linked
    case layersLinked = "\u{EEA1}"
    /// layers-off
    case layersOff = "\u{F150}"
    /// layers-selected
    case layersSelected = "\u{FEA9}"
    /// layers-selected-bottom
    case layersSelectedBottom = "\u{FEAA}"
    /// layers-subtract
    case layersSubtract = "\u{EACA}"
    /// layers-union
    case layersUnion = "\u{EACB}"
    /// layout
    case layout = "\u{EADB}"
    /// layout-2
    case layout2 = "\u{EACC}"
    /// layout-align-bottom
    case layoutAlignBottom = "\u{EACD}"
    /// layout-align-center
    case layoutAlignCenter = "\u{EACE}"
    /// layout-align-left
    case layoutAlignLeft = "\u{EACF}"
    /// layout-align-middle
    case layoutAlignMiddle = "\u{EAD0}"
    /// layout-align-right
    case layoutAlignRight = "\u{EAD1}"
    /// layout-align-top
    case layoutAlignTop = "\u{EAD2}"
    /// layout-board
    case layoutBoard = "\u{EF95}"
    /// layout-board-split
    case layoutBoardSplit = "\u{EF94}"
    /// layout-bottombar
    case layoutBottombar = "\u{EAD3}"
    /// layout-bottombar-collapse
    case layoutBottombarCollapse = "\u{F28B}"
    /// layout-bottombar-expand
    case layoutBottombarExpand = "\u{F28C}"
    /// layout-bottombar-inactive
    case layoutBottombarInactive = "\u{FD45}"
    /// layout-cards
    case layoutCards = "\u{EC13}"
    /// layout-collage
    case layoutCollage = "\u{F389}"
    /// layout-columns
    case layoutColumns = "\u{EAD4}"
    /// layout-dashboard
    case layoutDashboard = "\u{F02C}"
    /// layout-distribute-horizontal
    case layoutDistributeHorizontal = "\u{EAD5}"
    /// layout-distribute-vertical
    case layoutDistributeVertical = "\u{EAD6}"
    /// layout-grid
    case layoutGrid = "\u{EDBA}"
    /// layout-grid-add
    case layoutGridAdd = "\u{EDB9}"
    /// layout-grid-remove
    case layoutGridRemove = "\u{FA7D}"
    /// layout-kanban
    case layoutKanban = "\u{EC3F}"
    /// layout-list
    case layoutList = "\u{EC14}"
    /// layout-navbar
    case layoutNavbar = "\u{EAD7}"
    /// layout-navbar-collapse
    case layoutNavbarCollapse = "\u{F28D}"
    /// layout-navbar-expand
    case layoutNavbarExpand = "\u{F28E}"
    /// layout-navbar-inactive
    case layoutNavbarInactive = "\u{FD46}"
    /// layout-off
    case layoutOff = "\u{F151}"
    /// layout-rows
    case layoutRows = "\u{EAD8}"
    /// layout-sidebar
    case layoutSidebar = "\u{EADA}"
    /// layout-sidebar-inactive
    case layoutSidebarInactive = "\u{FD47}"
    /// layout-sidebar-left-collapse
    case layoutSidebarLeftCollapse = "\u{F004}"
    /// layout-sidebar-left-expand
    case layoutSidebarLeftExpand = "\u{F005}"
    /// layout-sidebar-right
    case layoutSidebarRight = "\u{EAD9}"
    /// layout-sidebar-right-collapse
    case layoutSidebarRightCollapse = "\u{F006}"
    /// layout-sidebar-right-expand
    case layoutSidebarRightExpand = "\u{F007}"
    /// layout-sidebar-right-inactive
    case layoutSidebarRightInactive = "\u{FD48}"
    /// leaf
    case leaf = "\u{ED4F}"
    /// leaf-2
    case leaf2 = "\u{FF44}"
    /// leaf-off
    case leafOff = "\u{F400}"
    /// lego
    case lego = "\u{EADC}"
    /// lego-off
    case legoOff = "\u{F401}"
    /// lemon
    case lemon = "\u{EF10}"
    /// lemon-2
    case lemon2 = "\u{EF81}"
    /// letter-a
    case letterA = "\u{EC50}"
    /// letter-a-small
    case letterASmall = "\u{FCC7}"
    /// letter-b
    case letterB = "\u{EC51}"
    /// letter-b-small
    case letterBSmall = "\u{FCC8}"
    /// letter-c
    case letterC = "\u{EC52}"
    /// letter-c-small
    case letterCSmall = "\u{FCC9}"
    /// letter-case
    case letterCase = "\u{EEA5}"
    /// letter-case-lower
    case letterCaseLower = "\u{EEA2}"
    /// letter-case-toggle
    case letterCaseToggle = "\u{EEA3}"
    /// letter-case-upper
    case letterCaseUpper = "\u{EEA4}"
    /// letter-d
    case letterD = "\u{EC53}"
    /// letter-d-small
    case letterDSmall = "\u{FCCA}"
    /// letter-e
    case letterE = "\u{EC54}"
    /// letter-e-small
    case letterESmall = "\u{FCCB}"
    /// letter-f
    case letterF = "\u{EC55}"
    /// letter-f-small
    case letterFSmall = "\u{FCCC}"
    /// letter-g
    case letterG = "\u{EC56}"
    /// letter-g-small
    case letterGSmall = "\u{FCCD}"
    /// letter-h
    case letterH = "\u{EC57}"
    /// letter-h-small
    case letterHSmall = "\u{FCCE}"
    /// letter-i
    case letterI = "\u{EC58}"
    /// letter-i-small
    case letterISmall = "\u{FCCF}"
    /// letter-j
    case letterJ = "\u{EC59}"
    /// letter-j-small
    case letterJSmall = "\u{FCD0}"
    /// letter-k
    case letterK = "\u{EC5A}"
    /// letter-k-small
    case letterKSmall = "\u{FCD1}"
    /// letter-l
    case letterL = "\u{EC5B}"
    /// letter-l-small
    case letterLSmall = "\u{FCD2}"
    /// letter-m
    case letterM = "\u{EC5C}"
    /// letter-m-small
    case letterMSmall = "\u{FCD3}"
    /// letter-n
    case letterN = "\u{EC5D}"
    /// letter-n-small
    case letterNSmall = "\u{FCD4}"
    /// letter-o
    case letterO = "\u{EC5E}"
    /// letter-o-small
    case letterOSmall = "\u{FCD5}"
    /// letter-p
    case letterP = "\u{EC5F}"
    /// letter-p-small
    case letterPSmall = "\u{FCD6}"
    /// letter-q
    case letterQ = "\u{EC60}"
    /// letter-q-small
    case letterQSmall = "\u{FCD7}"
    /// letter-r
    case letterR = "\u{EC61}"
    /// letter-r-small
    case letterRSmall = "\u{FCD8}"
    /// letter-s
    case letterS = "\u{EC62}"
    /// letter-s-small
    case letterSSmall = "\u{FCD9}"
    /// letter-spacing
    case letterSpacing = "\u{EEA6}"
    /// letter-t
    case letterT = "\u{EC63}"
    /// letter-t-small
    case letterTSmall = "\u{FCDA}"
    /// letter-u
    case letterU = "\u{EC64}"
    /// letter-u-small
    case letterUSmall = "\u{FCDB}"
    /// letter-v
    case letterV = "\u{EC65}"
    /// letter-v-small
    case letterVSmall = "\u{FCDC}"
    /// letter-w
    case letterW = "\u{EC66}"
    /// letter-w-small
    case letterWSmall = "\u{FCDD}"
    /// letter-x
    case letterX = "\u{EC67}"
    /// letter-x-small
    case letterXSmall = "\u{FCDE}"
    /// letter-y
    case letterY = "\u{EC68}"
    /// letter-y-small
    case letterYSmall = "\u{FCDF}"
    /// letter-z
    case letterZ = "\u{EC69}"
    /// letter-z-small
    case letterZSmall = "\u{FCE0}"
    /// library
    case library = "\u{FD4C}"
    /// library-minus
    case libraryMinus = "\u{FD49}"
    /// library-photo
    case libraryPhoto = "\u{FD4A}"
    /// library-plus
    case libraryPlus = "\u{FD4B}"
    /// license
    case license = "\u{EBC0}"
    /// license-off
    case licenseOff = "\u{F153}"
    /// lifebuoy
    case lifebuoy = "\u{EADD}"
    /// lifebuoy-off
    case lifebuoyOff = "\u{F154}"
    /// lighter
    case lighter = "\u{F794}"
    /// line
    case line = "\u{EC40}"
    /// line-dashed
    case lineDashed = "\u{EEA7}"
    /// line-dotted
    case lineDotted = "\u{EEA8}"
    /// line-height
    case lineHeight = "\u{EB94}"
    /// line-scan
    case lineScan = "\u{FCB8}"
    /// link
    case link = "\u{EADE}"
    /// link-minus
    case linkMinus = "\u{FD16}"
    /// link-off
    case linkOff = "\u{F402}"
    /// link-plus
    case linkPlus = "\u{FD17}"
    /// list
    case list = "\u{EB6B}"
    /// list-check
    case listCheck = "\u{EB6A}"
    /// list-details
    case listDetails = "\u{EF40}"
    /// list-letters
    case listLetters = "\u{FC47}"
    /// list-numbers
    case listNumbers = "\u{EF11}"
    /// list-search
    case listSearch = "\u{EEA9}"
    /// list-tree
    case listTree = "\u{FAFA}"
    /// live-photo
    case livePhoto = "\u{EADF}"
    /// live-photo-off
    case livePhotoOff = "\u{F403}"
    /// live-view
    case liveView = "\u{EC6B}"
    /// load-balancer
    case loadBalancer = "\u{FA5C}"
    /// loader
    case loader = "\u{ECA3}"
    /// loader-2
    case loader2 = "\u{F226}"
    /// loader-3
    case loader3 = "\u{F513}"
    /// loader-quarter
    case loaderQuarter = "\u{ECA2}"
    /// location
    case location = "\u{EAE0}"
    /// location-bolt
    case locationBolt = "\u{FBAF}"
    /// location-broken
    case locationBroken = "\u{F2C4}"
    /// location-cancel
    case locationCancel = "\u{FBB0}"
    /// location-check
    case locationCheck = "\u{FBB1}"
    /// location-code
    case locationCode = "\u{FBB2}"
    /// location-cog
    case locationCog = "\u{FBB3}"
    /// location-discount
    case locationDiscount = "\u{FBB4}"
    /// location-dollar
    case locationDollar = "\u{FBB5}"
    /// location-down
    case locationDown = "\u{FBB6}"
    /// location-exclamation
    case locationExclamation = "\u{FBB7}"
    /// location-heart
    case locationHeart = "\u{FBB8}"
    /// location-minus
    case locationMinus = "\u{FBB9}"
    /// location-off
    case locationOff = "\u{F155}"
    /// location-pause
    case locationPause = "\u{FBBA}"
    /// location-pin
    case locationPin = "\u{FBBB}"
    /// location-plus
    case locationPlus = "\u{FBBC}"
    /// location-question
    case locationQuestion = "\u{FBBD}"
    /// location-search
    case locationSearch = "\u{FBBE}"
    /// location-share
    case locationShare = "\u{FBBF}"
    /// location-star
    case locationStar = "\u{FBC0}"
    /// location-up
    case locationUp = "\u{FBC1}"
    /// location-x
    case locationX = "\u{FBC2}"
    /// lock
    case lock = "\u{EAE2}"
    /// lock-access
    case lockAccess = "\u{EEAA}"
    /// lock-access-off
    case lockAccessOff = "\u{F404}"
    /// lock-bitcoin
    case lockBitcoin = "\u{FF37}"
    /// lock-bolt
    case lockBolt = "\u{F924}"
    /// lock-cancel
    case lockCancel = "\u{F925}"
    /// lock-check
    case lockCheck = "\u{F926}"
    /// lock-code
    case lockCode = "\u{F927}"
    /// lock-cog
    case lockCog = "\u{F928}"
    /// lock-dollar
    case lockDollar = "\u{F929}"
    /// lock-down
    case lockDown = "\u{F92A}"
    /// lock-exclamation
    case lockExclamation = "\u{F92B}"
    /// lock-heart
    case lockHeart = "\u{F92C}"
    /// lock-minus
    case lockMinus = "\u{F92D}"
    /// lock-off
    case lockOff = "\u{ED1E}"
    /// lock-open
    case lockOpen = "\u{EAE1}"
    /// lock-open-2
    case lockOpen2 = "\u{FEA8}"
    /// lock-open-off
    case lockOpenOff = "\u{F156}"
    /// lock-password
    case lockPassword = "\u{FF9F}"
    /// lock-pause
    case lockPause = "\u{F92E}"
    /// lock-pin
    case lockPin = "\u{F92F}"
    /// lock-plus
    case lockPlus = "\u{F930}"
    /// lock-question
    case lockQuestion = "\u{F931}"
    /// lock-search
    case lockSearch = "\u{F932}"
    /// lock-share
    case lockShare = "\u{F933}"
    /// lock-square
    case lockSquare = "\u{EF51}"
    /// lock-square-rounded
    case lockSquareRounded = "\u{F636}"
    /// lock-star
    case lockStar = "\u{F934}"
    /// lock-up
    case lockUp = "\u{F935}"
    /// lock-x
    case lockX = "\u{F936}"
    /// logic-and
    case logicAnd = "\u{F240}"
    /// logic-buffer
    case logicBuffer = "\u{F241}"
    /// logic-nand
    case logicNand = "\u{F242}"
    /// logic-nor
    case logicNor = "\u{F243}"
    /// logic-not
    case logicNot = "\u{F244}"
    /// logic-or
    case logicOr = "\u{F245}"
    /// logic-xnor
    case logicXnor = "\u{F246}"
    /// logic-xor
    case logicXor = "\u{F247}"
    /// login
    case login = "\u{EBA7}"
    /// login-2
    case login2 = "\u{FC76}"
    /// logout
    case logout = "\u{EBA8}"
    /// logout-2
    case logout2 = "\u{FA7E}"
    /// logs
    case logs = "\u{FEA7}"
    /// lollipop
    case lollipop = "\u{EFCC}"
    /// lollipop-off
    case lollipopOff = "\u{F157}"
    /// luggage
    case luggage = "\u{EFAD}"
    /// luggage-off
    case luggageOff = "\u{F158}"
    /// lungs
    case lungs = "\u{EF62}"
    /// lungs-off
    case lungsOff = "\u{F405}"
    /// macro
    case macro = "\u{EEAB}"
    /// macro-off
    case macroOff = "\u{F406}"
    /// magnet
    case magnet = "\u{EAE3}"
    /// magnet-off
    case magnetOff = "\u{F159}"
    /// magnetic
    case magnetic = "\u{FCB9}"
    /// mail
    case mail = "\u{EAE5}"
    /// mail-ai
    case mailAi = "\u{FA31}"
    /// mail-bitcoin
    case mailBitcoin = "\u{FF36}"
    /// mail-bolt
    case mailBolt = "\u{F937}"
    /// mail-cancel
    case mailCancel = "\u{F938}"
    /// mail-check
    case mailCheck = "\u{F939}"
    /// mail-code
    case mailCode = "\u{F93A}"
    /// mail-cog
    case mailCog = "\u{F93B}"
    /// mail-dollar
    case mailDollar = "\u{F93C}"
    /// mail-down
    case mailDown = "\u{F93D}"
    /// mail-exclamation
    case mailExclamation = "\u{F93E}"
    /// mail-fast
    case mailFast = "\u{F069}"
    /// mail-forward
    case mailForward = "\u{EEAC}"
    /// mail-heart
    case mailHeart = "\u{F93F}"
    /// mail-minus
    case mailMinus = "\u{F940}"
    /// mail-off
    case mailOff = "\u{F15A}"
    /// mail-opened
    case mailOpened = "\u{EAE4}"
    /// mail-pause
    case mailPause = "\u{F941}"
    /// mail-pin
    case mailPin = "\u{F942}"
    /// mail-plus
    case mailPlus = "\u{F943}"
    /// mail-question
    case mailQuestion = "\u{F944}"
    /// mail-search
    case mailSearch = "\u{F945}"
    /// mail-share
    case mailShare = "\u{F946}"
    /// mail-spark
    case mailSpark = "\u{FFB3}"
    /// mail-star
    case mailStar = "\u{F947}"
    /// mail-up
    case mailUp = "\u{F948}"
    /// mail-x
    case mailX = "\u{F949}"
    /// mailbox
    case mailbox = "\u{EEAD}"
    /// mailbox-off
    case mailboxOff = "\u{F15B}"
    /// man
    case man = "\u{EAE6}"
    /// manual-gearbox
    case manualGearbox = "\u{ED7B}"
    /// map
    case map = "\u{EAE9}"
    /// map-2
    case map2 = "\u{EAE7}"
    /// map-bolt
    case mapBolt = "\u{FBC3}"
    /// map-cancel
    case mapCancel = "\u{FBC4}"
    /// map-check
    case mapCheck = "\u{FBC5}"
    /// map-code
    case mapCode = "\u{FBC6}"
    /// map-cog
    case mapCog = "\u{FBC7}"
    /// map-discount
    case mapDiscount = "\u{FBC8}"
    /// map-dollar
    case mapDollar = "\u{FBC9}"
    /// map-down
    case mapDown = "\u{FBCA}"
    /// map-east
    case mapEast = "\u{FC5D}"
    /// map-exclamation
    case mapExclamation = "\u{FBCB}"
    /// map-heart
    case mapHeart = "\u{FBCC}"
    /// map-minus
    case mapMinus = "\u{FBCD}"
    /// map-north
    case mapNorth = "\u{FC5E}"
    /// map-off
    case mapOff = "\u{F15C}"
    /// map-pause
    case mapPause = "\u{FBCE}"
    /// map-pin
    case mapPin = "\u{EAE8}"
    /// map-pin-2
    case mapPin2 = "\u{FC48}"
    /// map-pin-bolt
    case mapPinBolt = "\u{F94A}"
    /// map-pin-cancel
    case mapPinCancel = "\u{F94B}"
    /// map-pin-check
    case mapPinCheck = "\u{F94C}"
    /// map-pin-code
    case mapPinCode = "\u{F94D}"
    /// map-pin-cog
    case mapPinCog = "\u{F94E}"
    /// map-pin-dollar
    case mapPinDollar = "\u{F94F}"
    /// map-pin-down
    case mapPinDown = "\u{F950}"
    /// map-pin-exclamation
    case mapPinExclamation = "\u{F951}"
    /// map-pin-heart
    case mapPinHeart = "\u{F952}"
    /// map-pin-minus
    case mapPinMinus = "\u{F953}"
    /// map-pin-off
    case mapPinOff = "\u{ECF3}"
    /// map-pin-pause
    case mapPinPause = "\u{F954}"
    /// map-pin-pin
    case mapPinPin = "\u{F955}"
    /// map-pin-plus
    case mapPinPlus = "\u{F956}"
    /// map-pin-question
    case mapPinQuestion = "\u{F957}"
    /// map-pin-search
    case mapPinSearch = "\u{F958}"
    /// map-pin-share
    case mapPinShare = "\u{F795}"
    /// map-pin-star
    case mapPinStar = "\u{F959}"
    /// map-pin-up
    case mapPinUp = "\u{F95A}"
    /// map-pin-x
    case mapPinX = "\u{F95B}"
    /// map-pins
    case mapPins = "\u{ED5E}"
    /// map-plus
    case mapPlus = "\u{FBCF}"
    /// map-question
    case mapQuestion = "\u{FBD0}"
    /// map-route
    case mapRoute = "\u{FC79}"
    /// map-search
    case mapSearch = "\u{EF82}"
    /// map-share
    case mapShare = "\u{FBD1}"
    /// map-south
    case mapSouth = "\u{FC5F}"
    /// map-star
    case mapStar = "\u{FBD2}"
    /// map-up
    case mapUp = "\u{FBD3}"
    /// map-west
    case mapWest = "\u{FC60}"
    /// map-x
    case mapX = "\u{FBD4}"
    /// markdown
    case markdown = "\u{EC41}"
    /// markdown-off
    case markdownOff = "\u{F407}"
    /// marquee
    case marquee = "\u{EC77}"
    /// marquee-2
    case marquee2 = "\u{EEAE}"
    /// marquee-off
    case marqueeOff = "\u{F15D}"
    /// mars
    case mars = "\u{EC80}"
    /// mask
    case mask = "\u{EEB0}"
    /// mask-off
    case maskOff = "\u{EEAF}"
    /// masks-theater
    case masksTheater = "\u{F263}"
    /// masks-theater-off
    case masksTheaterOff = "\u{F408}"
    /// massage
    case massage = "\u{EEB1}"
    /// matchstick
    case matchstick = "\u{F577}"
    /// math
    case math = "\u{EBEB}"
    /// math-1-divide-2
    case math1Divide2 = "\u{F4E2}"
    /// math-1-divide-3
    case math1Divide3 = "\u{F4E3}"
    /// math-avg
    case mathAvg = "\u{F0F4}"
    /// math-cos
    case mathCos = "\u{FF1F}"
    /// math-ctg
    case mathCtg = "\u{FF35}"
    /// math-equal-greater
    case mathEqualGreater = "\u{F4E4}"
    /// math-equal-lower
    case mathEqualLower = "\u{F4E5}"
    /// math-function
    case mathFunction = "\u{EEB2}"
    /// math-function-off
    case mathFunctionOff = "\u{F15E}"
    /// math-function-y
    case mathFunctionY = "\u{F4E6}"
    /// math-greater
    case mathGreater = "\u{F4E7}"
    /// math-integral
    case mathIntegral = "\u{F4E9}"
    /// math-integral-x
    case mathIntegralX = "\u{F4E8}"
    /// math-integrals
    case mathIntegrals = "\u{F4EA}"
    /// math-lower
    case mathLower = "\u{F4EB}"
    /// math-max
    case mathMax = "\u{F0F5}"
    /// math-max-min
    case mathMaxMin = "\u{FDA0}"
    /// math-min
    case mathMin = "\u{F0F6}"
    /// math-not
    case mathNot = "\u{F4EC}"
    /// math-off
    case mathOff = "\u{F409}"
    /// math-pi
    case mathPi = "\u{F4EE}"
    /// math-pi-divide-2
    case mathPiDivide2 = "\u{F4ED}"
    /// math-sec
    case mathSec = "\u{FF34}"
    /// math-sin
    case mathSin = "\u{FF1E}"
    /// math-symbols
    case mathSymbols = "\u{EEB3}"
    /// math-tg
    case mathTg = "\u{FF33}"
    /// math-x-divide-2
    case mathXDivide2 = "\u{F4EF}"
    /// math-x-divide-y
    case mathXDivideY = "\u{F4F1}"
    /// math-x-divide-y-2
    case mathXDivideY2 = "\u{F4F0}"
    /// math-x-floor-divide-y
    case mathXFloorDivideY = "\u{10073}"
    /// math-x-minus-x
    case mathXMinusX = "\u{F4F2}"
    /// math-x-minus-y
    case mathXMinusY = "\u{F4F3}"
    /// math-x-plus-x
    case mathXPlusX = "\u{F4F4}"
    /// math-x-plus-y
    case mathXPlusY = "\u{F4F5}"
    /// math-xy
    case mathXy = "\u{F4F6}"
    /// math-y-minus-y
    case mathYMinusY = "\u{F4F7}"
    /// math-y-plus-y
    case mathYPlusY = "\u{F4F8}"
    /// matrix
    case matrix = "\u{100BC}"
    /// maximize
    case maximize = "\u{EAEA}"
    /// maximize-off
    case maximizeOff = "\u{F15F}"
    /// meat
    case meat = "\u{EF12}"
    /// meat-off
    case meatOff = "\u{F40A}"
    /// medal
    case medal = "\u{EC78}"
    /// medal-2
    case medal2 = "\u{EFCD}"
    /// medical-cross
    case medicalCross = "\u{EC2F}"
    /// medical-cross-circle
    case medicalCrossCircle = "\u{FAE8}"
    /// medical-cross-off
    case medicalCrossOff = "\u{F160}"
    /// medicine-syrup
    case medicineSyrup = "\u{EF63}"
    /// meeple
    case meeple = "\u{F514}"
    /// melon
    case melon = "\u{FC7A}"
    /// menorah
    case menorah = "\u{F58C}"
    /// menu
    case menu = "\u{EAEB}"
    /// menu-2
    case menu2 = "\u{EC42}"
    /// menu-3
    case menu3 = "\u{FF43}"
    /// menu-4
    case menu4 = "\u{FF42}"
    /// menu-deep
    case menuDeep = "\u{FAFB}"
    /// menu-order
    case menuOrder = "\u{F5F5}"
    /// message
    case message = "\u{EAEF}"
    /// message-2
    case message2 = "\u{EAEC}"
    /// message-2-bolt
    case message2Bolt = "\u{F95C}"
    /// message-2-cancel
    case message2Cancel = "\u{F95D}"
    /// message-2-check
    case message2Check = "\u{F95E}"
    /// message-2-code
    case message2Code = "\u{F012}"
    /// message-2-cog
    case message2Cog = "\u{F95F}"
    /// message-2-dollar
    case message2Dollar = "\u{F960}"
    /// message-2-down
    case message2Down = "\u{F961}"
    /// message-2-exclamation
    case message2Exclamation = "\u{F962}"
    /// message-2-heart
    case message2Heart = "\u{F963}"
    /// message-2-minus
    case message2Minus = "\u{F964}"
    /// message-2-off
    case message2Off = "\u{F40B}"
    /// message-2-pause
    case message2Pause = "\u{F965}"
    /// message-2-pin
    case message2Pin = "\u{F966}"
    /// message-2-plus
    case message2Plus = "\u{F967}"
    /// message-2-question
    case message2Question = "\u{F968}"
    /// message-2-search
    case message2Search = "\u{F969}"
    /// message-2-share
    case message2Share = "\u{F077}"
    /// message-2-star
    case message2Star = "\u{F96A}"
    /// message-2-up
    case message2Up = "\u{F96B}"
    /// message-2-x
    case message2X = "\u{F96C}"
    /// message-bolt
    case messageBolt = "\u{F96D}"
    /// message-cancel
    case messageCancel = "\u{F96E}"
    /// message-chatbot
    case messageChatbot = "\u{F38A}"
    /// message-check
    case messageCheck = "\u{F96F}"
    /// message-circle
    case messageCircle = "\u{EAED}"
    /// message-circle-bolt
    case messageCircleBolt = "\u{F970}"
    /// message-circle-cancel
    case messageCircleCancel = "\u{F971}"
    /// message-circle-check
    case messageCircleCheck = "\u{F972}"
    /// message-circle-code
    case messageCircleCode = "\u{F973}"
    /// message-circle-cog
    case messageCircleCog = "\u{F974}"
    /// message-circle-dollar
    case messageCircleDollar = "\u{F975}"
    /// message-circle-down
    case messageCircleDown = "\u{F976}"
    /// message-circle-exclamation
    case messageCircleExclamation = "\u{F977}"
    /// message-circle-heart
    case messageCircleHeart = "\u{F978}"
    /// message-circle-minus
    case messageCircleMinus = "\u{F979}"
    /// message-circle-off
    case messageCircleOff = "\u{ED40}"
    /// message-circle-pause
    case messageCirclePause = "\u{F97A}"
    /// message-circle-pin
    case messageCirclePin = "\u{F97B}"
    /// message-circle-plus
    case messageCirclePlus = "\u{F97C}"
    /// message-circle-question
    case messageCircleQuestion = "\u{F97D}"
    /// message-circle-search
    case messageCircleSearch = "\u{F97E}"
    /// message-circle-share
    case messageCircleShare = "\u{F97F}"
    /// message-circle-star
    case messageCircleStar = "\u{F980}"
    /// message-circle-up
    case messageCircleUp = "\u{F981}"
    /// message-circle-user
    case messageCircleUser = "\u{FEC5}"
    /// message-circle-x
    case messageCircleX = "\u{F982}"
    /// message-code
    case messageCode = "\u{F013}"
    /// message-cog
    case messageCog = "\u{F983}"
    /// message-dollar
    case messageDollar = "\u{F984}"
    /// message-dots
    case messageDots = "\u{EAEE}"
    /// message-down
    case messageDown = "\u{F985}"
    /// message-exclamation
    case messageExclamation = "\u{F986}"
    /// message-forward
    case messageForward = "\u{F28F}"
    /// message-heart
    case messageHeart = "\u{F987}"
    /// message-language
    case messageLanguage = "\u{EFAE}"
    /// message-minus
    case messageMinus = "\u{F988}"
    /// message-off
    case messageOff = "\u{ED41}"
    /// message-pause
    case messagePause = "\u{F989}"
    /// message-pin
    case messagePin = "\u{F98A}"
    /// message-plus
    case messagePlus = "\u{EC9A}"
    /// message-question
    case messageQuestion = "\u{F98B}"
    /// message-reply
    case messageReply = "\u{FD4D}"
    /// message-report
    case messageReport = "\u{EC9B}"
    /// message-search
    case messageSearch = "\u{F98C}"
    /// message-share
    case messageShare = "\u{F078}"
    /// message-star
    case messageStar = "\u{F98D}"
    /// message-up
    case messageUp = "\u{F98E}"
    /// message-user
    case messageUser = "\u{FEC4}"
    /// message-x
    case messageX = "\u{F98F}"
    /// messages
    case messages = "\u{EB6C}"
    /// messages-off
    case messagesOff = "\u{ED42}"
    /// meteor
    case meteor = "\u{F1FD}"
    /// meteor-off
    case meteorOff = "\u{F40C}"
    /// meter-cube
    case meterCube = "\u{FD7C}"
    /// meter-square
    case meterSquare = "\u{FD7D}"
    /// metronome
    case metronome = "\u{FD25}"
    /// michelin-bib-gourmand
    case michelinBibGourmand = "\u{FAE9}"
    /// michelin-star
    case michelinStar = "\u{FAEB}"
    /// michelin-star-green
    case michelinStarGreen = "\u{FAEA}"
    /// mickey
    case mickey = "\u{F2A3}"
    /// microphone
    case microphone = "\u{EAF0}"
    /// microphone-2
    case microphone2 = "\u{EF2C}"
    /// microphone-2-off
    case microphone2Off = "\u{F40D}"
    /// microphone-off
    case microphoneOff = "\u{ED16}"
    /// microscope
    case microscope = "\u{EF64}"
    /// microscope-off
    case microscopeOff = "\u{F40E}"
    /// microwave
    case microwave = "\u{F248}"
    /// microwave-off
    case microwaveOff = "\u{F264}"
    /// military-award
    case militaryAward = "\u{F079}"
    /// military-rank
    case militaryRank = "\u{EFCF}"
    /// milk
    case milk = "\u{EF13}"
    /// milk-off
    case milkOff = "\u{F40F}"
    /// milkshake
    case milkshake = "\u{F4C8}"
    /// minimize
    case minimize = "\u{EAF1}"
    /// minus
    case minus = "\u{EAF2}"
    /// minus-vertical
    case minusVertical = "\u{EEB4}"
    /// mist
    case mist = "\u{EC30}"
    /// mist-off
    case mistOff = "\u{F410}"
    /// mobiledata
    case mobiledata = "\u{F9F5}"
    /// mobiledata-off
    case mobiledataOff = "\u{F9F4}"
    /// moneybag
    case moneybag = "\u{F506}"
    /// moneybag-edit
    case moneybagEdit = "\u{1013D}"
    /// moneybag-heart
    case moneybagHeart = "\u{1013C}"
    /// moneybag-minus
    case moneybagMinus = "\u{1013B}"
    /// moneybag-move
    case moneybagMove = "\u{10139}"
    /// moneybag-move-back
    case moneybagMoveBack = "\u{1013A}"
    /// moneybag-plus
    case moneybagPlus = "\u{10138}"
    /// monkeybar
    case monkeybar = "\u{FEB4}"
    /// mood-angry
    case moodAngry = "\u{F2DE}"
    /// mood-annoyed
    case moodAnnoyed = "\u{F2E0}"
    /// mood-annoyed-2
    case moodAnnoyed2 = "\u{F2DF}"
    /// mood-bitcoin
    case moodBitcoin = "\u{FF32}"
    /// mood-boy
    case moodBoy = "\u{ED2D}"
    /// mood-check
    case moodCheck = "\u{F7B3}"
    /// mood-cog
    case moodCog = "\u{F7B4}"
    /// mood-confuzed
    case moodConfuzed = "\u{EAF3}"
    /// mood-crazy-happy
    case moodCrazyHappy = "\u{ED90}"
    /// mood-cry
    case moodCry = "\u{ECBB}"
    /// mood-dollar
    case moodDollar = "\u{F7B5}"
    /// mood-edit
    case moodEdit = "\u{FA05}"
    /// mood-empty
    case moodEmpty = "\u{EEB5}"
    /// mood-happy
    case moodHappy = "\u{EAF4}"
    /// mood-heart
    case moodHeart = "\u{F7B6}"
    /// mood-kid
    case moodKid = "\u{EC03}"
    /// mood-look-down
    case moodLookDown = "\u{FD37}"
    /// mood-look-left
    case moodLookLeft = "\u{F2C5}"
    /// mood-look-right
    case moodLookRight = "\u{F2C6}"
    /// mood-look-up
    case moodLookUp = "\u{FD38}"
    /// mood-minus
    case moodMinus = "\u{F7B7}"
    /// mood-nerd
    case moodNerd = "\u{F2E1}"
    /// mood-nervous
    case moodNervous = "\u{EF96}"
    /// mood-neutral
    case moodNeutral = "\u{EAF5}"
    /// mood-off
    case moodOff = "\u{F161}"
    /// mood-pin
    case moodPin = "\u{F7B8}"
    /// mood-plus
    case moodPlus = "\u{F7B9}"
    /// mood-puzzled
    case moodPuzzled = "\u{FD39}"
    /// mood-sad
    case moodSad = "\u{EAF6}"
    /// mood-sad-2
    case moodSad2 = "\u{F2E2}"
    /// mood-sad-dizzy
    case moodSadDizzy = "\u{F2E3}"
    /// mood-sad-squint
    case moodSadSquint = "\u{F2E4}"
    /// mood-search
    case moodSearch = "\u{F7BA}"
    /// mood-share
    case moodShare = "\u{FA06}"
    /// mood-sick
    case moodSick = "\u{F2E5}"
    /// mood-silence
    case moodSilence = "\u{F2E6}"
    /// mood-sing
    case moodSing = "\u{F2C7}"
    /// mood-smile
    case moodSmile = "\u{EAF7}"
    /// mood-smile-beam
    case moodSmileBeam = "\u{F2E7}"
    /// mood-smile-dizzy
    case moodSmileDizzy = "\u{F2E8}"
    /// mood-spark
    case moodSpark = "\u{FFB2}"
    /// mood-surprised
    case moodSurprised = "\u{EC04}"
    /// mood-tongue
    case moodTongue = "\u{EB95}"
    /// mood-tongue-wink
    case moodTongueWink = "\u{F2EA}"
    /// mood-tongue-wink-2
    case moodTongueWink2 = "\u{F2E9}"
    /// mood-unamused
    case moodUnamused = "\u{F2EB}"
    /// mood-up
    case moodUp = "\u{F7BB}"
    /// mood-wink
    case moodWink = "\u{F2ED}"
    /// mood-wink-2
    case moodWink2 = "\u{F2EC}"
    /// mood-wrrr
    case moodWrrr = "\u{F2EE}"
    /// mood-x
    case moodX = "\u{F7BC}"
    /// mood-xd
    case moodXd = "\u{F2EF}"
    /// moon
    case moon = "\u{EAF8}"
    /// moon-2
    case moon2 = "\u{ECE6}"
    /// moon-off
    case moonOff = "\u{F162}"
    /// moon-stars
    case moonStars = "\u{ECE7}"
    /// moped
    case moped = "\u{ECBC}"
    /// motorbike
    case motorbike = "\u{EEB6}"
    /// mountain
    case mountain = "\u{EF97}"
    /// mountain-off
    case mountainOff = "\u{F411}"
    /// mouse
    case mouse = "\u{EAF9}"
    /// mouse-2
    case mouse2 = "\u{F1D7}"
    /// mouse-off
    case mouseOff = "\u{F163}"
    /// moustache
    case moustache = "\u{F4C9}"
    /// movie
    case movie = "\u{EAFA}"
    /// movie-off
    case movieOff = "\u{F164}"
    /// mug
    case mug = "\u{EAFB}"
    /// mug-off
    case mugOff = "\u{F165}"
    /// multiplier-0-5x
    case multiplier05x = "\u{EF41}"
    /// multiplier-1-5x
    case multiplier15x = "\u{EF42}"
    /// multiplier-1x
    case multiplier1x = "\u{EF43}"
    /// multiplier-2x
    case multiplier2x = "\u{EF44}"
    /// mushroom
    case mushroom = "\u{EF14}"
    /// mushroom-off
    case mushroomOff = "\u{F412}"
    /// music
    case music = "\u{EAFC}"
    /// music-bolt
    case musicBolt = "\u{FBD5}"
    /// music-cancel
    case musicCancel = "\u{FBD6}"
    /// music-check
    case musicCheck = "\u{FBD7}"
    /// music-code
    case musicCode = "\u{FBD8}"
    /// music-cog
    case musicCog = "\u{FBD9}"
    /// music-discount
    case musicDiscount = "\u{FBDA}"
    /// music-dollar
    case musicDollar = "\u{FBDB}"
    /// music-down
    case musicDown = "\u{FBDC}"
    /// music-exclamation
    case musicExclamation = "\u{FBDD}"
    /// music-heart
    case musicHeart = "\u{FBDE}"
    /// music-minus
    case musicMinus = "\u{FBDF}"
    /// music-off
    case musicOff = "\u{F166}"
    /// music-pause
    case musicPause = "\u{FBE0}"
    /// music-pin
    case musicPin = "\u{FBE1}"
    /// music-plus
    case musicPlus = "\u{FBE2}"
    /// music-question
    case musicQuestion = "\u{FBE3}"
    /// music-search
    case musicSearch = "\u{FBE4}"
    /// music-share
    case musicShare = "\u{FBE5}"
    /// music-star
    case musicStar = "\u{FBE6}"
    /// music-up
    case musicUp = "\u{FBE7}"
    /// music-x
    case musicX = "\u{FBE8}"
    /// navigation
    case navigation = "\u{F2C8}"
    /// navigation-bolt
    case navigationBolt = "\u{FBE9}"
    /// navigation-cancel
    case navigationCancel = "\u{FBEA}"
    /// navigation-check
    case navigationCheck = "\u{FBEB}"
    /// navigation-code
    case navigationCode = "\u{FBEC}"
    /// navigation-cog
    case navigationCog = "\u{FBED}"
    /// navigation-discount
    case navigationDiscount = "\u{FBEE}"
    /// navigation-dollar
    case navigationDollar = "\u{FBEF}"
    /// navigation-down
    case navigationDown = "\u{FBF0}"
    /// navigation-east
    case navigationEast = "\u{FCBA}"
    /// navigation-exclamation
    case navigationExclamation = "\u{FBF1}"
    /// navigation-heart
    case navigationHeart = "\u{FBF2}"
    /// navigation-minus
    case navigationMinus = "\u{FBF3}"
    /// navigation-north
    case navigationNorth = "\u{FCBB}"
    /// navigation-off
    case navigationOff = "\u{F413}"
    /// navigation-pause
    case navigationPause = "\u{FBF4}"
    /// navigation-pin
    case navigationPin = "\u{FBF5}"
    /// navigation-plus
    case navigationPlus = "\u{FBF6}"
    /// navigation-question
    case navigationQuestion = "\u{FBF7}"
    /// navigation-search
    case navigationSearch = "\u{FBF8}"
    /// navigation-share
    case navigationShare = "\u{FBF9}"
    /// navigation-south
    case navigationSouth = "\u{FCBC}"
    /// navigation-star
    case navigationStar = "\u{FBFA}"
    /// navigation-top
    case navigationTop = "\u{FAEC}"
    /// navigation-up
    case navigationUp = "\u{FBFB}"
    /// navigation-west
    case navigationWest = "\u{FCBD}"
    /// navigation-x
    case navigationX = "\u{FBFC}"
    /// needle
    case needle = "\u{F508}"
    /// needle-thread
    case needleThread = "\u{F507}"
    /// network
    case network = "\u{F09F}"
    /// network-off
    case networkOff = "\u{F414}"
    /// new-section
    case newSection = "\u{EBC1}"
    /// news
    case news = "\u{EAFD}"
    /// news-off
    case newsOff = "\u{F167}"
    /// nfc
    case nfc = "\u{EEB7}"
    /// nfc-off
    case nfcOff = "\u{F168}"
    /// no-copyright
    case noCopyright = "\u{EFB9}"
    /// no-creative-commons
    case noCreativeCommons = "\u{EFBA}"
    /// no-derivatives
    case noDerivatives = "\u{EFBB}"
    /// north-star
    case northStar = "\u{F014}"
    /// note
    case note = "\u{EB6D}"
    /// note-off
    case noteOff = "\u{F169}"
    /// notebook
    case notebook = "\u{EB96}"
    /// notebook-off
    case notebookOff = "\u{F415}"
    /// notes
    case notes = "\u{EB6E}"
    /// notes-off
    case notesOff = "\u{F16A}"
    /// notification
    case notification = "\u{EAFE}"
    /// notification-off
    case notificationOff = "\u{F16B}"
    /// number
    case number = "\u{F1FE}"
    /// number-0
    case number0 = "\u{EDF0}"
    /// number-0-small
    case number0Small = "\u{FCE1}"
    /// number-1
    case number1 = "\u{EDF1}"
    /// number-1-small
    case number1Small = "\u{FCE2}"
    /// number-10
    case number10 = "\u{1005E}"
    /// number-10-small
    case number10Small = "\u{FCE3}"
    /// number-100-small
    case number100Small = "\u{10005}"
    /// number-11
    case number11 = "\u{1005D}"
    /// number-11-small
    case number11Small = "\u{FCE4}"
    /// number-12-small
    case number12Small = "\u{FCE5}"
    /// number-123
    case number123 = "\u{F554}"
    /// number-13-small
    case number13Small = "\u{FCE6}"
    /// number-14-small
    case number14Small = "\u{FCE7}"
    /// number-15-small
    case number15Small = "\u{FCE8}"
    /// number-16-small
    case number16Small = "\u{FCE9}"
    /// number-17-small
    case number17Small = "\u{FCEA}"
    /// number-18-small
    case number18Small = "\u{FCEB}"
    /// number-19-small
    case number19Small = "\u{FCEC}"
    /// number-2
    case number2 = "\u{EDF2}"
    /// number-2-small
    case number2Small = "\u{FCED}"
    /// number-20-small
    case number20Small = "\u{FCEE}"
    /// number-21-small
    case number21Small = "\u{FCEF}"
    /// number-22-small
    case number22Small = "\u{FCF0}"
    /// number-23-small
    case number23Small = "\u{FCF1}"
    /// number-24-small
    case number24Small = "\u{FCF2}"
    /// number-25-small
    case number25Small = "\u{FCF3}"
    /// number-26-small
    case number26Small = "\u{FCF4}"
    /// number-27-small
    case number27Small = "\u{FCF5}"
    /// number-28-small
    case number28Small = "\u{FCF6}"
    /// number-29-small
    case number29Small = "\u{FCF7}"
    /// number-3
    case number3 = "\u{EDF3}"
    /// number-3-small
    case number3Small = "\u{FCF8}"
    /// number-30-small
    case number30Small = "\u{10004}"
    /// number-31-small
    case number31Small = "\u{10003}"
    /// number-32-small
    case number32Small = "\u{10002}"
    /// number-33-small
    case number33Small = "\u{10001}"
    /// number-34-small
    case number34Small = "\u{10000}"
    /// number-35-small
    case number35Small = "\u{FFFF}"
    /// number-36-small
    case number36Small = "\u{FFFE}"
    /// number-37-small
    case number37Small = "\u{FFFD}"
    /// number-38-small
    case number38Small = "\u{FFFC}"
    /// number-39-small
    case number39Small = "\u{FFFB}"
    /// number-4
    case number4 = "\u{EDF4}"
    /// number-4-small
    case number4Small = "\u{FCF9}"
    /// number-40-small
    case number40Small = "\u{FFFA}"
    /// number-41-small
    case number41Small = "\u{FFF9}"
    /// number-42-small
    case number42Small = "\u{FFF8}"
    /// number-43-small
    case number43Small = "\u{FFF7}"
    /// number-44-small
    case number44Small = "\u{FFF6}"
    /// number-45-small
    case number45Small = "\u{FFF5}"
    /// number-46-small
    case number46Small = "\u{FFF4}"
    /// number-47-small
    case number47Small = "\u{FFF3}"
    /// number-48-small
    case number48Small = "\u{FFF2}"
    /// number-49-small
    case number49Small = "\u{FFF1}"
    /// number-5
    case number5 = "\u{EDF5}"
    /// number-5-small
    case number5Small = "\u{FCFA}"
    /// number-50-small
    case number50Small = "\u{FFF0}"
    /// number-51-small
    case number51Small = "\u{FFEF}"
    /// number-52-small
    case number52Small = "\u{FFEE}"
    /// number-53-small
    case number53Small = "\u{FFED}"
    /// number-54-small
    case number54Small = "\u{FFEC}"
    /// number-55-small
    case number55Small = "\u{FFEB}"
    /// number-56-small
    case number56Small = "\u{FFEA}"
    /// number-57-small
    case number57Small = "\u{FFE9}"
    /// number-58-small
    case number58Small = "\u{FFE8}"
    /// number-59-small
    case number59Small = "\u{FFE7}"
    /// number-6
    case number6 = "\u{EDF6}"
    /// number-6-small
    case number6Small = "\u{FCFB}"
    /// number-60-small
    case number60Small = "\u{FFE6}"
    /// number-61-small
    case number61Small = "\u{FFE5}"
    /// number-62-small
    case number62Small = "\u{FFE4}"
    /// number-63-small
    case number63Small = "\u{FFE3}"
    /// number-64-small
    case number64Small = "\u{FFE2}"
    /// number-65-small
    case number65Small = "\u{FFE1}"
    /// number-66-small
    case number66Small = "\u{FFE0}"
    /// number-67-small
    case number67Small = "\u{FFDF}"
    /// number-68-small
    case number68Small = "\u{FFDE}"
    /// number-69-small
    case number69Small = "\u{FFDD}"
    /// number-7
    case number7 = "\u{EDF7}"
    /// number-7-small
    case number7Small = "\u{FCFC}"
    /// number-70-small
    case number70Small = "\u{FFDC}"
    /// number-71-small
    case number71Small = "\u{FFDB}"
    /// number-72-small
    case number72Small = "\u{FFDA}"
    /// number-73-small
    case number73Small = "\u{FFD9}"
    /// number-74-small
    case number74Small = "\u{FFD8}"
    /// number-75-small
    case number75Small = "\u{FFD7}"
    /// number-76-small
    case number76Small = "\u{FFD6}"
    /// number-77-small
    case number77Small = "\u{FFD5}"
    /// number-78-small
    case number78Small = "\u{FFD4}"
    /// number-79-small
    case number79Small = "\u{FFD3}"
    /// number-8
    case number8 = "\u{EDF8}"
    /// number-8-small
    case number8Small = "\u{FCFD}"
    /// number-80-small
    case number80Small = "\u{FFD2}"
    /// number-81-small
    case number81Small = "\u{FFD1}"
    /// number-82-small
    case number82Small = "\u{FFD0}"
    /// number-83-small
    case number83Small = "\u{FFCF}"
    /// number-84-small
    case number84Small = "\u{FFCE}"
    /// number-85-small
    case number85Small = "\u{FFCD}"
    /// number-86-small
    case number86Small = "\u{FFCC}"
    /// number-87-small
    case number87Small = "\u{FFCB}"
    /// number-88-small
    case number88Small = "\u{FFCA}"
    /// number-89-small
    case number89Small = "\u{FFC9}"
    /// number-9
    case number9 = "\u{EDF9}"
    /// number-9-small
    case number9Small = "\u{FCFE}"
    /// number-90-small
    case number90Small = "\u{FFC8}"
    /// number-91-small
    case number91Small = "\u{FFC7}"
    /// number-92-small
    case number92Small = "\u{FFC6}"
    /// number-93-small
    case number93Small = "\u{FFC5}"
    /// number-94-small
    case number94Small = "\u{FFC4}"
    /// number-95-small
    case number95Small = "\u{FFC3}"
    /// number-96-small
    case number96Small = "\u{FFC2}"
    /// number-97-small
    case number97Small = "\u{FFC1}"
    /// number-98-small
    case number98Small = "\u{FFC0}"
    /// number-99-small
    case number99Small = "\u{FFBF}"
    /// numbers
    case numbers = "\u{F015}"
    /// nurse
    case nurse = "\u{EF65}"
    /// nut
    case nut = "\u{FC61}"
    /// object-scan
    case objectScan = "\u{FEF1}"
    /// octagon
    case octagon = "\u{ECBD}"
    /// octagon-minus
    case octagonMinus = "\u{FC92}"
    /// octagon-minus-2
    case octagonMinus2 = "\u{FC91}"
    /// octagon-off
    case octagonOff = "\u{EEB8}"
    /// octagon-plus
    case octagonPlus = "\u{FC94}"
    /// octagon-plus-2
    case octagonPlus2 = "\u{FC93}"
    /// octahedron
    case octahedron = "\u{FAAE}"
    /// octahedron-off
    case octahedronOff = "\u{FAAC}"
    /// octahedron-plus
    case octahedronPlus = "\u{FAAD}"
    /// old
    case old = "\u{EEB9}"
    /// olympics
    case olympics = "\u{EEBA}"
    /// olympics-off
    case olympicsOff = "\u{F416}"
    /// om
    case om = "\u{F58D}"
    /// omega
    case omega = "\u{EB97}"
    /// option
    case option = "\u{1019F}"
    /// outbound
    case outbound = "\u{F249}"
    /// outlet
    case outlet = "\u{EBD7}"
    /// oval
    case oval = "\u{F02E}"
    /// oval-vertical
    case ovalVertical = "\u{F02D}"
    /// overline
    case overline = "\u{EEBB}"
    /// package
    case package = "\u{EAFF}"
    /// package-export
    case packageExport = "\u{F07A}"
    /// package-import
    case packageImport = "\u{F07B}"
    /// package-off
    case packageOff = "\u{F16C}"
    /// packages
    case packages = "\u{F2C9}"
    /// pacman
    case pacman = "\u{EEBC}"
    /// page-break
    case pageBreak = "\u{EC81}"
    /// paint
    case paint = "\u{EB00}"
    /// paint-off
    case paintOff = "\u{F16D}"
    /// palette
    case palette = "\u{EB01}"
    /// palette-off
    case paletteOff = "\u{F16E}"
    /// panorama-horizontal
    case panoramaHorizontal = "\u{ED33}"
    /// panorama-horizontal-off
    case panoramaHorizontalOff = "\u{F417}"
    /// panorama-vertical
    case panoramaVertical = "\u{ED34}"
    /// panorama-vertical-off
    case panoramaVerticalOff = "\u{F418}"
    /// paper-bag
    case paperBag = "\u{F02F}"
    /// paper-bag-off
    case paperBagOff = "\u{F16F}"
    /// paperclip
    case paperclip = "\u{EB02}"
    /// parachute
    case parachute = "\u{ED7C}"
    /// parachute-off
    case parachuteOff = "\u{F170}"
    /// parentheses
    case parentheses = "\u{EBD8}"
    /// parentheses-off
    case parenthesesOff = "\u{F171}"
    /// parking
    case parking = "\u{EB03}"
    /// parking-circle
    case parkingCircle = "\u{FD5A}"
    /// parking-off
    case parkingOff = "\u{F172}"
    /// password
    case password = "\u{F4CA}"
    /// password-fingerprint
    case passwordFingerprint = "\u{FC7B}"
    /// password-mobile-phone
    case passwordMobilePhone = "\u{FC7C}"
    /// password-user
    case passwordUser = "\u{FC7D}"
    /// paw
    case paw = "\u{EFF9}"
    /// paw-off
    case pawOff = "\u{F419}"
    /// paywall
    case paywall = "\u{FD7E}"
    /// pdf
    case pdf = "\u{F7AC}"
    /// peace
    case peace = "\u{ECBE}"
    /// pencil
    case pencil = "\u{EB04}"
    /// pencil-bolt
    case pencilBolt = "\u{FBFD}"
    /// pencil-cancel
    case pencilCancel = "\u{FBFE}"
    /// pencil-check
    case pencilCheck = "\u{FBFF}"
    /// pencil-code
    case pencilCode = "\u{FC00}"
    /// pencil-cog
    case pencilCog = "\u{FC01}"
    /// pencil-discount
    case pencilDiscount = "\u{FC02}"
    /// pencil-dollar
    case pencilDollar = "\u{FC03}"
    /// pencil-down
    case pencilDown = "\u{FC04}"
    /// pencil-exclamation
    case pencilExclamation = "\u{FC05}"
    /// pencil-heart
    case pencilHeart = "\u{FC06}"
    /// pencil-minus
    case pencilMinus = "\u{F1EB}"
    /// pencil-off
    case pencilOff = "\u{F173}"
    /// pencil-pause
    case pencilPause = "\u{FC07}"
    /// pencil-pin
    case pencilPin = "\u{FC08}"
    /// pencil-plus
    case pencilPlus = "\u{F1EC}"
    /// pencil-question
    case pencilQuestion = "\u{FC09}"
    /// pencil-search
    case pencilSearch = "\u{FC0A}"
    /// pencil-share
    case pencilShare = "\u{FC0B}"
    /// pencil-star
    case pencilStar = "\u{FC0C}"
    /// pencil-up
    case pencilUp = "\u{FC0D}"
    /// pencil-x
    case pencilX = "\u{FC0E}"
    /// pennant
    case pennant = "\u{ED7D}"
    /// pennant-2
    case pennant2 = "\u{F06A}"
    /// pennant-off
    case pennantOff = "\u{F174}"
    /// pentagon
    case pentagon = "\u{EFE3}"
    /// pentagon-minus
    case pentagonMinus = "\u{FEB3}"
    /// pentagon-number-0
    case pentagonNumber0 = "\u{FC7E}"
    /// pentagon-number-1
    case pentagonNumber1 = "\u{FC7F}"
    /// pentagon-number-2
    case pentagonNumber2 = "\u{FC80}"
    /// pentagon-number-3
    case pentagonNumber3 = "\u{FC81}"
    /// pentagon-number-4
    case pentagonNumber4 = "\u{FC82}"
    /// pentagon-number-5
    case pentagonNumber5 = "\u{FC83}"
    /// pentagon-number-6
    case pentagonNumber6 = "\u{FC84}"
    /// pentagon-number-7
    case pentagonNumber7 = "\u{FC85}"
    /// pentagon-number-8
    case pentagonNumber8 = "\u{FC86}"
    /// pentagon-number-9
    case pentagonNumber9 = "\u{FC87}"
    /// pentagon-off
    case pentagonOff = "\u{F41A}"
    /// pentagon-plus
    case pentagonPlus = "\u{FC49}"
    /// pentagon-x
    case pentagonX = "\u{FC88}"
    /// pentagram
    case pentagram = "\u{F586}"
    /// pepper
    case pepper = "\u{EF15}"
    /// pepper-off
    case pepperOff = "\u{F175}"
    /// percentage
    case percentage = "\u{ECF4}"
    /// percentage-0
    case percentage0 = "\u{FEE5}"
    /// percentage-10
    case percentage10 = "\u{FEE4}"
    /// percentage-100
    case percentage100 = "\u{FEE3}"
    /// percentage-20
    case percentage20 = "\u{FEE2}"
    /// percentage-25
    case percentage25 = "\u{FEE1}"
    /// percentage-30
    case percentage30 = "\u{FEE0}"
    /// percentage-33
    case percentage33 = "\u{FEDF}"
    /// percentage-40
    case percentage40 = "\u{FEDE}"
    /// percentage-50
    case percentage50 = "\u{FEDD}"
    /// percentage-60
    case percentage60 = "\u{FEDC}"
    /// percentage-66
    case percentage66 = "\u{FEDB}"
    /// percentage-70
    case percentage70 = "\u{FEDA}"
    /// percentage-75
    case percentage75 = "\u{FED9}"
    /// percentage-80
    case percentage80 = "\u{FED8}"
    /// percentage-90
    case percentage90 = "\u{FED7}"
    /// perfume
    case perfume = "\u{F509}"
    /// perspective
    case perspective = "\u{EEBD}"
    /// perspective-off
    case perspectiveOff = "\u{F176}"
    /// phone
    case phone = "\u{EB09}"
    /// phone-call
    case phoneCall = "\u{EB05}"
    /// phone-calling
    case phoneCalling = "\u{EC43}"
    /// phone-check
    case phoneCheck = "\u{EC05}"
    /// phone-done
    case phoneDone = "\u{FF9E}"
    /// phone-end
    case phoneEnd = "\u{FF9D}"
    /// phone-incoming
    case phoneIncoming = "\u{EB06}"
    /// phone-off
    case phoneOff = "\u{ECF5}"
    /// phone-outgoing
    case phoneOutgoing = "\u{EB07}"
    /// phone-pause
    case phonePause = "\u{EB08}"
    /// phone-plus
    case phonePlus = "\u{EC06}"
    /// phone-ringing
    case phoneRinging = "\u{FF9C}"
    /// phone-spark
    case phoneSpark = "\u{FFB1}"
    /// phone-x
    case phoneX = "\u{EC07}"
    /// photo
    case photo = "\u{EB0A}"
    /// photo-ai
    case photoAi = "\u{FA32}"
    /// photo-bitcoin
    case photoBitcoin = "\u{FF31}"
    /// photo-bolt
    case photoBolt = "\u{F990}"
    /// photo-cancel
    case photoCancel = "\u{F35D}"
    /// photo-check
    case photoCheck = "\u{F35E}"
    /// photo-circle
    case photoCircle = "\u{FC4A}"
    /// photo-circle-minus
    case photoCircleMinus = "\u{FC62}"
    /// photo-circle-plus
    case photoCirclePlus = "\u{FC63}"
    /// photo-code
    case photoCode = "\u{F991}"
    /// photo-cog
    case photoCog = "\u{F992}"
    /// photo-dollar
    case photoDollar = "\u{F993}"
    /// photo-down
    case photoDown = "\u{F35F}"
    /// photo-edit
    case photoEdit = "\u{F360}"
    /// photo-exclamation
    case photoExclamation = "\u{F994}"
    /// photo-heart
    case photoHeart = "\u{F361}"
    /// photo-hexagon
    case photoHexagon = "\u{FC4B}"
    /// photo-minus
    case photoMinus = "\u{F362}"
    /// photo-off
    case photoOff = "\u{ECF6}"
    /// photo-pause
    case photoPause = "\u{F995}"
    /// photo-pentagon
    case photoPentagon = "\u{FC4C}"
    /// photo-pin
    case photoPin = "\u{F996}"
    /// photo-plus
    case photoPlus = "\u{F363}"
    /// photo-question
    case photoQuestion = "\u{F997}"
    /// photo-scan
    case photoScan = "\u{FCA8}"
    /// photo-search
    case photoSearch = "\u{F364}"
    /// photo-sensor
    case photoSensor = "\u{F798}"
    /// photo-sensor-2
    case photoSensor2 = "\u{F796}"
    /// photo-sensor-3
    case photoSensor3 = "\u{F797}"
    /// photo-share
    case photoShare = "\u{F998}"
    /// photo-shield
    case photoShield = "\u{F365}"
    /// photo-spark
    case photoSpark = "\u{FFB0}"
    /// photo-square-rounded
    case photoSquareRounded = "\u{FC4D}"
    /// photo-star
    case photoStar = "\u{F366}"
    /// photo-up
    case photoUp = "\u{F38B}"
    /// photo-video
    case photoVideo = "\u{FC95}"
    /// photo-x
    case photoX = "\u{F367}"
    /// physotherapist
    case physotherapist = "\u{EEBE}"
    /// piano
    case piano = "\u{FAD3}"
    /// pick
    case pick = "\u{FAFC}"
    /// picnic-table
    case picnicTable = "\u{FED6}"
    /// picture-in-picture
    case pictureInPicture = "\u{ED35}"
    /// picture-in-picture-off
    case pictureInPictureOff = "\u{ED43}"
    /// picture-in-picture-on
    case pictureInPictureOn = "\u{ED44}"
    /// picture-in-picture-top
    case pictureInPictureTop = "\u{EFE4}"
    /// pig
    case pig = "\u{EF52}"
    /// pig-money
    case pigMoney = "\u{F38C}"
    /// pig-off
    case pigOff = "\u{F177}"
    /// pilcrow
    case pilcrow = "\u{F5F6}"
    /// pilcrow-left
    case pilcrowLeft = "\u{FD7F}"
    /// pilcrow-right
    case pilcrowRight = "\u{FD80}"
    /// pill
    case pill = "\u{EC44}"
    /// pill-off
    case pillOff = "\u{F178}"
    /// pills
    case pills = "\u{EF66}"
    /// pin
    case pin = "\u{EC9C}"
    /// pin-end
    case pinEnd = "\u{FD5B}"
    /// pin-invoke
    case pinInvoke = "\u{FD5C}"
    /// ping-pong
    case pingPong = "\u{F38D}"
    /// pinned
    case pinned = "\u{ED60}"
    /// pinned-off
    case pinnedOff = "\u{ED5F}"
    /// pizza
    case pizza = "\u{EDBB}"
    /// pizza-off
    case pizzaOff = "\u{F179}"
    /// placeholder
    case placeholder = "\u{F626}"
    /// plane
    case plane = "\u{EB6F}"
    /// plane-arrival
    case planeArrival = "\u{EB99}"
    /// plane-departure
    case planeDeparture = "\u{EB9A}"
    /// plane-inflight
    case planeInflight = "\u{EF98}"
    /// plane-off
    case planeOff = "\u{F17A}"
    /// plane-tilt
    case planeTilt = "\u{F1ED}"
    /// planet
    case planet = "\u{EC08}"
    /// planet-off
    case planetOff = "\u{F17B}"
    /// plant
    case plant = "\u{ED50}"
    /// plant-2
    case plant2 = "\u{ED7E}"
    /// plant-2-off
    case plant2Off = "\u{F17C}"
    /// plant-off
    case plantOff = "\u{F17D}"
    /// play-basketball
    case playBasketball = "\u{FA66}"
    /// play-card
    case playCard = "\u{EEBF}"
    /// play-card-1
    case playCard1 = "\u{1005C}"
    /// play-card-10
    case playCard10 = "\u{1005B}"
    /// play-card-2
    case playCard2 = "\u{1005A}"
    /// play-card-3
    case playCard3 = "\u{10059}"
    /// play-card-4
    case playCard4 = "\u{10058}"
    /// play-card-5
    case playCard5 = "\u{10057}"
    /// play-card-6
    case playCard6 = "\u{10056}"
    /// play-card-7
    case playCard7 = "\u{10055}"
    /// play-card-8
    case playCard8 = "\u{10054}"
    /// play-card-9
    case playCard9 = "\u{10053}"
    /// play-card-a
    case playCardA = "\u{10052}"
    /// play-card-j
    case playCardJ = "\u{10051}"
    /// play-card-k
    case playCardK = "\u{10050}"
    /// play-card-off
    case playCardOff = "\u{F17E}"
    /// play-card-q
    case playCardQ = "\u{1004F}"
    /// play-card-star
    case playCardStar = "\u{1004E}"
    /// play-football
    case playFootball = "\u{FA67}"
    /// play-handball
    case playHandball = "\u{FA68}"
    /// play-volleyball
    case playVolleyball = "\u{FA69}"
    /// player-eject
    case playerEject = "\u{EFBC}"
    /// player-pause
    case playerPause = "\u{ED45}"
    /// player-play
    case playerPlay = "\u{ED46}"
    /// player-record
    case playerRecord = "\u{ED47}"
    /// player-skip-back
    case playerSkipBack = "\u{ED48}"
    /// player-skip-forward
    case playerSkipForward = "\u{ED49}"
    /// player-stop
    case playerStop = "\u{ED4A}"
    /// player-track-next
    case playerTrackNext = "\u{ED4B}"
    /// player-track-prev
    case playerTrackPrev = "\u{ED4C}"
    /// playlist
    case playlist = "\u{EEC0}"
    /// playlist-add
    case playlistAdd = "\u{F008}"
    /// playlist-off
    case playlistOff = "\u{F17F}"
    /// playlist-x
    case playlistX = "\u{F009}"
    /// playstation-circle
    case playstationCircle = "\u{F2AD}"
    /// playstation-square
    case playstationSquare = "\u{F2AE}"
    /// playstation-triangle
    case playstationTriangle = "\u{F2AF}"
    /// playstation-x
    case playstationX = "\u{F2B0}"
    /// plug
    case plug = "\u{EBD9}"
    /// plug-connected
    case plugConnected = "\u{F00A}"
    /// plug-connected-x
    case plugConnectedX = "\u{F0A0}"
    /// plug-off
    case plugOff = "\u{F180}"
    /// plug-x
    case plugX = "\u{F0A1}"
    /// plus
    case plus = "\u{EB0B}"
    /// plus-equal
    case plusEqual = "\u{F7AD}"
    /// plus-minus
    case plusMinus = "\u{F7AE}"
    /// png
    case png = "\u{F3AD}"
    /// podium
    case podium = "\u{F1D8}"
    /// podium-off
    case podiumOff = "\u{F41B}"
    /// point
    case point = "\u{EB0C}"
    /// point-off
    case pointOff = "\u{F181}"
    /// pointer
    case pointer = "\u{F265}"
    /// pointer-bolt
    case pointerBolt = "\u{F999}"
    /// pointer-cancel
    case pointerCancel = "\u{F99A}"
    /// pointer-check
    case pointerCheck = "\u{F99B}"
    /// pointer-code
    case pointerCode = "\u{F99C}"
    /// pointer-cog
    case pointerCog = "\u{F99D}"
    /// pointer-dollar
    case pointerDollar = "\u{F99E}"
    /// pointer-down
    case pointerDown = "\u{F99F}"
    /// pointer-exclamation
    case pointerExclamation = "\u{F9A0}"
    /// pointer-heart
    case pointerHeart = "\u{F9A1}"
    /// pointer-minus
    case pointerMinus = "\u{F9A2}"
    /// pointer-off
    case pointerOff = "\u{F9A3}"
    /// pointer-pause
    case pointerPause = "\u{F9A4}"
    /// pointer-pin
    case pointerPin = "\u{F9A5}"
    /// pointer-plus
    case pointerPlus = "\u{F9A6}"
    /// pointer-question
    case pointerQuestion = "\u{F9A7}"
    /// pointer-search
    case pointerSearch = "\u{F9A8}"
    /// pointer-share
    case pointerShare = "\u{F9A9}"
    /// pointer-star
    case pointerStar = "\u{F9AA}"
    /// pointer-up
    case pointerUp = "\u{F9AB}"
    /// pointer-x
    case pointerX = "\u{F9AC}"
    /// pokeball
    case pokeball = "\u{EEC1}"
    /// pokeball-off
    case pokeballOff = "\u{F41C}"
    /// poker-chip
    case pokerChip = "\u{F515}"
    /// polaroid
    case polaroid = "\u{EEC2}"
    /// polygon
    case polygon = "\u{EFD0}"
    /// polygon-off
    case polygonOff = "\u{F182}"
    /// poo
    case poo = "\u{F258}"
    /// pool
    case pool = "\u{ED91}"
    /// pool-off
    case poolOff = "\u{F41D}"
    /// power
    case power = "\u{EB0D}"
    /// pray
    case pray = "\u{ECBF}"
    /// premium-rights
    case premiumRights = "\u{EFBD}"
    /// prescription
    case prescription = "\u{EF99}"
    /// presentation
    case presentation = "\u{EB70}"
    /// presentation-analytics
    case presentationAnalytics = "\u{EEC3}"
    /// presentation-off
    case presentationOff = "\u{F183}"
    /// printer
    case printer = "\u{EB0E}"
    /// printer-off
    case printerOff = "\u{F184}"
    /// prism
    case prism = "\u{FAB1}"
    /// prism-light
    case prismLight = "\u{FEA6}"
    /// prism-off
    case prismOff = "\u{FAAF}"
    /// prism-plus
    case prismPlus = "\u{FAB0}"
    /// prison
    case prison = "\u{EF79}"
    /// progress
    case progress = "\u{FA0D}"
    /// progress-alert
    case progressAlert = "\u{FA07}"
    /// progress-bolt
    case progressBolt = "\u{FA08}"
    /// progress-check
    case progressCheck = "\u{FA09}"
    /// progress-down
    case progressDown = "\u{FA0A}"
    /// progress-help
    case progressHelp = "\u{FA0B}"
    /// progress-x
    case progressX = "\u{FA0C}"
    /// prompt
    case prompt = "\u{EB0F}"
    /// prong
    case prong = "\u{FDA1}"
    /// propeller
    case propeller = "\u{EEC4}"
    /// propeller-off
    case propellerOff = "\u{F185}"
    /// protocol
    case `protocol` = "\u{FD81}"
    /// pumpkin-scary
    case pumpkinScary = "\u{F587}"
    /// puzzle
    case puzzle = "\u{EB10}"
    /// puzzle-2
    case puzzle2 = "\u{EF83}"
    /// puzzle-off
    case puzzleOff = "\u{F186}"
    /// pyramid
    case pyramid = "\u{EEC5}"
    /// pyramid-off
    case pyramidOff = "\u{F187}"
    /// pyramid-plus
    case pyramidPlus = "\u{FAB2}"
    /// qrcode
    case qrcode = "\u{EB11}"
    /// qrcode-off
    case qrcodeOff = "\u{F41E}"
    /// question-mark
    case questionMark = "\u{EC9D}"
    /// quote
    case quote = "\u{EFBE}"
    /// quote-off
    case quoteOff = "\u{F188}"
    /// quotes
    case quotes = "\u{FB1E}"
    /// radar
    case radar = "\u{F017}"
    /// radar-2
    case radar2 = "\u{F016}"
    /// radar-off
    case radarOff = "\u{F41F}"
    /// radio
    case radio = "\u{EF2D}"
    /// radio-off
    case radioOff = "\u{F420}"
    /// radioactive
    case radioactive = "\u{ECC0}"
    /// radioactive-off
    case radioactiveOff = "\u{F189}"
    /// radius-bottom-left
    case radiusBottomLeft = "\u{EEC6}"
    /// radius-bottom-right
    case radiusBottomRight = "\u{EEC7}"
    /// radius-top-left
    case radiusTopLeft = "\u{EEC8}"
    /// radius-top-right
    case radiusTopRight = "\u{EEC9}"
    /// rainbow
    case rainbow = "\u{EDBC}"
    /// rainbow-off
    case rainbowOff = "\u{F18A}"
    /// rating-12-plus
    case rating12Plus = "\u{F266}"
    /// rating-14-plus
    case rating14Plus = "\u{F267}"
    /// rating-16-plus
    case rating16Plus = "\u{F268}"
    /// rating-18-plus
    case rating18Plus = "\u{F269}"
    /// rating-21-plus
    case rating21Plus = "\u{F26A}"
    /// razor
    case razor = "\u{F4B5}"
    /// razor-electric
    case razorElectric = "\u{F4B4}"
    /// receipt
    case receipt = "\u{EDFD}"
    /// receipt-2
    case receipt2 = "\u{EDFA}"
    /// receipt-bitcoin
    case receiptBitcoin = "\u{FD66}"
    /// receipt-dollar
    case receiptDollar = "\u{FD67}"
    /// receipt-euro
    case receiptEuro = "\u{FD68}"
    /// receipt-off
    case receiptOff = "\u{EDFB}"
    /// receipt-pound
    case receiptPound = "\u{FD69}"
    /// receipt-refund
    case receiptRefund = "\u{EDFC}"
    /// receipt-rupee
    case receiptRupee = "\u{FD82}"
    /// receipt-tax
    case receiptTax = "\u{EDBD}"
    /// receipt-yen
    case receiptYen = "\u{FD6A}"
    /// receipt-yuan
    case receiptYuan = "\u{FD6B}"
    /// recharging
    case recharging = "\u{EECA}"
    /// record-mail
    case recordMail = "\u{EB12}"
    /// record-mail-off
    case recordMailOff = "\u{F18B}"
    /// rectangle
    case rectangle = "\u{ED37}"
    /// rectangle-rounded-bottom
    case rectangleRoundedBottom = "\u{FAED}"
    /// rectangle-rounded-top
    case rectangleRoundedTop = "\u{FAEE}"
    /// rectangle-vertical
    case rectangleVertical = "\u{ED36}"
    /// rectangular-prism
    case rectangularPrism = "\u{FAB5}"
    /// rectangular-prism-off
    case rectangularPrismOff = "\u{FAB3}"
    /// rectangular-prism-plus
    case rectangularPrismPlus = "\u{FAB4}"
    /// recycle
    case recycle = "\u{EB9B}"
    /// recycle-off
    case recycleOff = "\u{F18C}"
    /// refresh
    case refresh = "\u{EB13}"
    /// refresh-alert
    case refreshAlert = "\u{ED57}"
    /// refresh-dot
    case refreshDot = "\u{EFBF}"
    /// refresh-off
    case refreshOff = "\u{F18D}"
    /// regex
    case regex = "\u{F31F}"
    /// regex-off
    case regexOff = "\u{F421}"
    /// registered
    case registered = "\u{EB14}"
    /// relation-many-to-many
    case relationManyToMany = "\u{ED7F}"
    /// relation-one-to-many
    case relationOneToMany = "\u{ED80}"
    /// relation-one-to-one
    case relationOneToOne = "\u{ED81}"
    /// reload
    case reload = "\u{F3AE}"
    /// reorder
    case reorder = "\u{FC15}"
    /// repeat
    case `repeat` = "\u{EB72}"
    /// repeat-off
    case repeatOff = "\u{F18E}"
    /// repeat-once
    case repeatOnce = "\u{EB71}"
    /// replace
    case replace = "\u{EBC7}"
    /// replace-off
    case replaceOff = "\u{F422}"
    /// replace-user
    case replaceUser = "\u{100F0}"
    /// report
    case report = "\u{EECE}"
    /// report-analytics
    case reportAnalytics = "\u{EECB}"
    /// report-medical
    case reportMedical = "\u{EECC}"
    /// report-money
    case reportMoney = "\u{EECD}"
    /// report-off
    case reportOff = "\u{F18F}"
    /// report-search
    case reportSearch = "\u{EF84}"
    /// reserved-line
    case reservedLine = "\u{F9F6}"
    /// resize
    case resize = "\u{EECF}"
    /// restore
    case restore = "\u{FAFD}"
    /// rewind-backward-10
    case rewindBackward10 = "\u{FABA}"
    /// rewind-backward-15
    case rewindBackward15 = "\u{FABB}"
    /// rewind-backward-20
    case rewindBackward20 = "\u{FABC}"
    /// rewind-backward-30
    case rewindBackward30 = "\u{FABD}"
    /// rewind-backward-40
    case rewindBackward40 = "\u{FABE}"
    /// rewind-backward-5
    case rewindBackward5 = "\u{FABF}"
    /// rewind-backward-50
    case rewindBackward50 = "\u{FAC0}"
    /// rewind-backward-60
    case rewindBackward60 = "\u{FAC1}"
    /// rewind-forward-10
    case rewindForward10 = "\u{FAC2}"
    /// rewind-forward-15
    case rewindForward15 = "\u{FAC3}"
    /// rewind-forward-20
    case rewindForward20 = "\u{FAC4}"
    /// rewind-forward-30
    case rewindForward30 = "\u{FAC5}"
    /// rewind-forward-40
    case rewindForward40 = "\u{FAC6}"
    /// rewind-forward-5
    case rewindForward5 = "\u{FAC7}"
    /// rewind-forward-50
    case rewindForward50 = "\u{FAC8}"
    /// rewind-forward-60
    case rewindForward60 = "\u{FAC9}"
    /// ribbon-health
    case ribbonHealth = "\u{F58E}"
    /// rings
    case rings = "\u{FA6A}"
    /// ripple
    case ripple = "\u{ED82}"
    /// ripple-down
    case rippleDown = "\u{101AA}"
    /// ripple-off
    case rippleOff = "\u{F190}"
    /// ripple-up
    case rippleUp = "\u{101A9}"
    /// road
    case road = "\u{F018}"
    /// road-off
    case roadOff = "\u{F191}"
    /// road-sign
    case roadSign = "\u{ECDD}"
    /// robot
    case robot = "\u{F00B}"
    /// robot-face
    case robotFace = "\u{FCBE}"
    /// robot-off
    case robotOff = "\u{F192}"
    /// rocket
    case rocket = "\u{EC45}"
    /// rocket-off
    case rocketOff = "\u{F193}"
    /// roller-skating
    case rollerSkating = "\u{EFD1}"
    /// rollercoaster
    case rollercoaster = "\u{F0A2}"
    /// rollercoaster-off
    case rollercoasterOff = "\u{F423}"
    /// rosette
    case rosette = "\u{F599}"
    /// rosette-asterisk
    case rosetteAsterisk = "\u{101A8}"
    /// rosette-discount
    case rosetteDiscount = "\u{EE7C}"
    /// rosette-discount-check
    case rosetteDiscountCheck = "\u{F1F8}"
    /// rosette-discount-check-off
    case rosetteDiscountCheckOff = "\u{FF10}"
    /// rosette-discount-off
    case rosetteDiscountOff = "\u{F3E6}"
    /// rosette-number-0
    case rosetteNumber0 = "\u{F58F}"
    /// rosette-number-1
    case rosetteNumber1 = "\u{F590}"
    /// rosette-number-2
    case rosetteNumber2 = "\u{F591}"
    /// rosette-number-3
    case rosetteNumber3 = "\u{F592}"
    /// rosette-number-4
    case rosetteNumber4 = "\u{F593}"
    /// rosette-number-5
    case rosetteNumber5 = "\u{F594}"
    /// rosette-number-6
    case rosetteNumber6 = "\u{F595}"
    /// rosette-number-7
    case rosetteNumber7 = "\u{F596}"
    /// rosette-number-8
    case rosetteNumber8 = "\u{F597}"
    /// rosette-number-9
    case rosetteNumber9 = "\u{F598}"
    /// rotate
    case rotate = "\u{EB16}"
    /// rotate-2
    case rotate2 = "\u{EBB4}"
    /// rotate-360
    case rotate360 = "\u{EF85}"
    /// rotate-3d
    case rotate3d = "\u{F020}"
    /// rotate-clockwise
    case rotateClockwise = "\u{EB15}"
    /// rotate-clockwise-2
    case rotateClockwise2 = "\u{EBB5}"
    /// rotate-dot
    case rotateDot = "\u{EFE5}"
    /// rotate-rectangle
    case rotateRectangle = "\u{EC15}"
    /// route
    case route = "\u{EB17}"
    /// route-2
    case route2 = "\u{F4B6}"
    /// route-alt-left
    case routeAltLeft = "\u{FCA9}"
    /// route-alt-right
    case routeAltRight = "\u{FCAA}"
    /// route-off
    case routeOff = "\u{F194}"
    /// route-scan
    case routeScan = "\u{FCBF}"
    /// route-square
    case routeSquare = "\u{FCAC}"
    /// route-square-2
    case routeSquare2 = "\u{FCAB}"
    /// route-x
    case routeX = "\u{FCAE}"
    /// route-x-2
    case routeX2 = "\u{FCAD}"
    /// router
    case router = "\u{EB18}"
    /// router-off
    case routerOff = "\u{F424}"
    /// row-insert-bottom
    case rowInsertBottom = "\u{EED0}"
    /// row-insert-top
    case rowInsertTop = "\u{EED1}"
    /// row-remove
    case rowRemove = "\u{FAFE}"
    /// rss
    case rss = "\u{EB19}"
    /// rubber-stamp
    case rubberStamp = "\u{F5AB}"
    /// rubber-stamp-off
    case rubberStampOff = "\u{F5AA}"
    /// ruler
    case ruler = "\u{EB1A}"
    /// ruler-2
    case ruler2 = "\u{EED2}"
    /// ruler-2-off
    case ruler2Off = "\u{F195}"
    /// ruler-3
    case ruler3 = "\u{F290}"
    /// ruler-measure
    case rulerMeasure = "\u{F291}"
    /// ruler-measure-2
    case rulerMeasure2 = "\u{FF0F}"
    /// ruler-off
    case rulerOff = "\u{F196}"
    /// run
    case run = "\u{EC82}"
    /// rv-truck
    case rvTruck = "\u{FCC0}"
    /// s-turn-down
    case sTurnDown = "\u{F516}"
    /// s-turn-left
    case sTurnLeft = "\u{F517}"
    /// s-turn-right
    case sTurnRight = "\u{F518}"
    /// s-turn-up
    case sTurnUp = "\u{F519}"
    /// sailboat
    case sailboat = "\u{EC83}"
    /// sailboat-2
    case sailboat2 = "\u{F5F7}"
    /// sailboat-off
    case sailboatOff = "\u{F425}"
    /// salad
    case salad = "\u{F50A}"
    /// salt
    case salt = "\u{EF16}"
    /// sandbox
    case sandbox = "\u{FD6C}"
    /// satellite
    case satellite = "\u{EED3}"
    /// satellite-off
    case satelliteOff = "\u{F197}"
    /// sausage
    case sausage = "\u{EF17}"
    /// scale
    case scale = "\u{EBC2}"
    /// scale-off
    case scaleOff = "\u{F198}"
    /// scale-outline
    case scaleOutline = "\u{EF53}"
    /// scale-outline-off
    case scaleOutlineOff = "\u{F199}"
    /// scan
    case scan = "\u{EBC8}"
    /// scan-eye
    case scanEye = "\u{F1FF}"
    /// scan-position
    case scanPosition = "\u{FDAC}"
    /// schema
    case schema = "\u{F200}"
    /// schema-off
    case schemaOff = "\u{F426}"
    /// school
    case school = "\u{ECF7}"
    /// school-bell
    case schoolBell = "\u{F64A}"
    /// school-off
    case schoolOff = "\u{F19A}"
    /// scissors
    case scissors = "\u{EB1B}"
    /// scissors-off
    case scissorsOff = "\u{F19B}"
    /// scooter
    case scooter = "\u{EC6C}"
    /// scooter-electric
    case scooterElectric = "\u{ECC1}"
    /// scoreboard
    case scoreboard = "\u{FA6B}"
    /// screen-share
    case screenShare = "\u{ED18}"
    /// screen-share-off
    case screenShareOff = "\u{ED17}"
    /// screenshot
    case screenshot = "\u{F201}"
    /// scribble
    case scribble = "\u{F0A3}"
    /// scribble-off
    case scribbleOff = "\u{F427}"
    /// script
    case script = "\u{F2DA}"
    /// script-minus
    case scriptMinus = "\u{F2D7}"
    /// script-plus
    case scriptPlus = "\u{F2D8}"
    /// script-x
    case scriptX = "\u{F2D9}"
    /// scuba-diving
    case scubaDiving = "\u{FD4E}"
    /// scuba-diving-tank
    case scubaDivingTank = "\u{FEFA}"
    /// scuba-mask
    case scubaMask = "\u{EED4}"
    /// scuba-mask-off
    case scubaMaskOff = "\u{F428}"
    /// sdk
    case sdk = "\u{F3AF}"
    /// search
    case search = "\u{EB1C}"
    /// search-off
    case searchOff = "\u{F19C}"
    /// section
    case section = "\u{EED5}"
    /// section-sign
    case sectionSign = "\u{F019}"
    /// seedling
    case seedling = "\u{ED51}"
    /// seedling-off
    case seedlingOff = "\u{F19D}"
    /// select
    case select = "\u{EC9E}"
    /// select-all
    case selectAll = "\u{F9F7}"
    /// selector
    case selector = "\u{EB1D}"
    /// send
    case send = "\u{EB1E}"
    /// send-2
    case send2 = "\u{FD5D}"
    /// send-off
    case sendOff = "\u{F429}"
    /// seo
    case seo = "\u{F26B}"
    /// separator
    case separator = "\u{EBDA}"
    /// separator-horizontal
    case separatorHorizontal = "\u{EC79}"
    /// separator-vertical
    case separatorVertical = "\u{EC7A}"
    /// server
    case server = "\u{EB1F}"
    /// server-2
    case server2 = "\u{F07C}"
    /// server-bolt
    case serverBolt = "\u{F320}"
    /// server-cog
    case serverCog = "\u{F321}"
    /// server-off
    case serverOff = "\u{F19E}"
    /// server-spark
    case serverSpark = "\u{FFAF}"
    /// servicemark
    case servicemark = "\u{EC09}"
    /// settings
    case settings = "\u{EB20}"
    /// settings-2
    case settings2 = "\u{F5AC}"
    /// settings-ai
    case settingsAi = "\u{101A7}"
    /// settings-automation
    case settingsAutomation = "\u{EED6}"
    /// settings-bolt
    case settingsBolt = "\u{F9AD}"
    /// settings-cancel
    case settingsCancel = "\u{F9AE}"
    /// settings-check
    case settingsCheck = "\u{F9AF}"
    /// settings-code
    case settingsCode = "\u{F9B0}"
    /// settings-cog
    case settingsCog = "\u{F9B1}"
    /// settings-dollar
    case settingsDollar = "\u{F9B2}"
    /// settings-down
    case settingsDown = "\u{F9B3}"
    /// settings-exclamation
    case settingsExclamation = "\u{F9B4}"
    /// settings-heart
    case settingsHeart = "\u{F9B5}"
    /// settings-minus
    case settingsMinus = "\u{F9B6}"
    /// settings-off
    case settingsOff = "\u{F19F}"
    /// settings-pause
    case settingsPause = "\u{F9B7}"
    /// settings-pin
    case settingsPin = "\u{F9B8}"
    /// settings-plus
    case settingsPlus = "\u{F9B9}"
    /// settings-question
    case settingsQuestion = "\u{F9BA}"
    /// settings-search
    case settingsSearch = "\u{F9BB}"
    /// settings-share
    case settingsShare = "\u{F9BC}"
    /// settings-spark
    case settingsSpark = "\u{FFAE}"
    /// settings-star
    case settingsStar = "\u{F9BD}"
    /// settings-up
    case settingsUp = "\u{F9BE}"
    /// settings-x
    case settingsX = "\u{F9BF}"
    /// shadow
    case shadow = "\u{EED8}"
    /// shadow-off
    case shadowOff = "\u{EED7}"
    /// shape
    case shape = "\u{EB9C}"
    /// shape-2
    case shape2 = "\u{EED9}"
    /// shape-3
    case shape3 = "\u{EEDA}"
    /// shape-off
    case shapeOff = "\u{F1A0}"
    /// share
    case share = "\u{EB21}"
    /// share-2
    case share2 = "\u{F799}"
    /// share-3
    case share3 = "\u{F7BD}"
    /// share-off
    case shareOff = "\u{F1A1}"
    /// shareplay
    case shareplay = "\u{FEA5}"
    /// shield
    case shield = "\u{EB24}"
    /// shield-bolt
    case shieldBolt = "\u{F9C0}"
    /// shield-cancel
    case shieldCancel = "\u{F9C1}"
    /// shield-check
    case shieldCheck = "\u{EB22}"
    /// shield-checkered
    case shieldCheckered = "\u{EF9A}"
    /// shield-chevron
    case shieldChevron = "\u{EF9B}"
    /// shield-code
    case shieldCode = "\u{F9C2}"
    /// shield-cog
    case shieldCog = "\u{F9C3}"
    /// shield-dollar
    case shieldDollar = "\u{F9C4}"
    /// shield-down
    case shieldDown = "\u{F9C5}"
    /// shield-exclamation
    case shieldExclamation = "\u{F9C6}"
    /// shield-half
    case shieldHalf = "\u{F358}"
    /// shield-heart
    case shieldHeart = "\u{F9C7}"
    /// shield-lock
    case shieldLock = "\u{ED58}"
    /// shield-minus
    case shieldMinus = "\u{F9C8}"
    /// shield-off
    case shieldOff = "\u{ECF8}"
    /// shield-pause
    case shieldPause = "\u{F9C9}"
    /// shield-pin
    case shieldPin = "\u{F9CA}"
    /// shield-plus
    case shieldPlus = "\u{F9CB}"
    /// shield-question
    case shieldQuestion = "\u{F9CC}"
    /// shield-search
    case shieldSearch = "\u{F9CD}"
    /// shield-share
    case shieldShare = "\u{F9CE}"
    /// shield-star
    case shieldStar = "\u{F9CF}"
    /// shield-up
    case shieldUp = "\u{F9D0}"
    /// shield-x
    case shieldX = "\u{EB23}"
    /// ship
    case ship = "\u{EC84}"
    /// ship-off
    case shipOff = "\u{F42A}"
    /// shirt
    case shirt = "\u{EC0A}"
    /// shirt-off
    case shirtOff = "\u{F1A2}"
    /// shirt-sport
    case shirtSport = "\u{F26C}"
    /// shoe
    case shoe = "\u{EFD2}"
    /// shoe-off
    case shoeOff = "\u{F1A4}"
    /// shopping-bag
    case shoppingBag = "\u{F5F8}"
    /// shopping-bag-check
    case shoppingBagCheck = "\u{FC16}"
    /// shopping-bag-discount
    case shoppingBagDiscount = "\u{FC17}"
    /// shopping-bag-edit
    case shoppingBagEdit = "\u{FC18}"
    /// shopping-bag-exclamation
    case shoppingBagExclamation = "\u{FC19}"
    /// shopping-bag-heart
    case shoppingBagHeart = "\u{FDA2}"
    /// shopping-bag-minus
    case shoppingBagMinus = "\u{FC1A}"
    /// shopping-bag-plus
    case shoppingBagPlus = "\u{FC1B}"
    /// shopping-bag-search
    case shoppingBagSearch = "\u{FC1C}"
    /// shopping-bag-x
    case shoppingBagX = "\u{FC1D}"
    /// shopping-cart
    case shoppingCart = "\u{EB25}"
    /// shopping-cart-bolt
    case shoppingCartBolt = "\u{FB57}"
    /// shopping-cart-cancel
    case shoppingCartCancel = "\u{FB58}"
    /// shopping-cart-check
    case shoppingCartCheck = "\u{FB59}"
    /// shopping-cart-code
    case shoppingCartCode = "\u{FB5A}"
    /// shopping-cart-cog
    case shoppingCartCog = "\u{FB5B}"
    /// shopping-cart-copy
    case shoppingCartCopy = "\u{FB5C}"
    /// shopping-cart-discount
    case shoppingCartDiscount = "\u{FB5D}"
    /// shopping-cart-dollar
    case shoppingCartDollar = "\u{FB5E}"
    /// shopping-cart-down
    case shoppingCartDown = "\u{FB5F}"
    /// shopping-cart-exclamation
    case shoppingCartExclamation = "\u{FB60}"
    /// shopping-cart-heart
    case shoppingCartHeart = "\u{FB61}"
    /// shopping-cart-minus
    case shoppingCartMinus = "\u{FB62}"
    /// shopping-cart-off
    case shoppingCartOff = "\u{EEDC}"
    /// shopping-cart-pause
    case shoppingCartPause = "\u{FB63}"
    /// shopping-cart-pin
    case shoppingCartPin = "\u{FB64}"
    /// shopping-cart-plus
    case shoppingCartPlus = "\u{FB65}"
    /// shopping-cart-question
    case shoppingCartQuestion = "\u{FB66}"
    /// shopping-cart-search
    case shoppingCartSearch = "\u{FB67}"
    /// shopping-cart-share
    case shoppingCartShare = "\u{FB68}"
    /// shopping-cart-star
    case shoppingCartStar = "\u{FB69}"
    /// shopping-cart-up
    case shoppingCartUp = "\u{FB6A}"
    /// shopping-cart-x
    case shoppingCartX = "\u{FB6B}"
    /// shovel
    case shovel = "\u{F1D9}"
    /// shovel-pitchforks
    case shovelPitchforks = "\u{FD3A}"
    /// shredder
    case shredder = "\u{EEDF}"
    /// sign-left
    case signLeft = "\u{F06B}"
    /// sign-right
    case signRight = "\u{F06C}"
    /// signal-2g
    case signal2g = "\u{F79A}"
    /// signal-3g
    case signal3g = "\u{F1EE}"
    /// signal-4g
    case signal4g = "\u{F1EF}"
    /// signal-4g-plus
    case signal4gPlus = "\u{F259}"
    /// signal-5g
    case signal5g = "\u{F1F0}"
    /// signal-6g
    case signal6g = "\u{F9F8}"
    /// signal-e
    case signalE = "\u{F9F9}"
    /// signal-g
    case signalG = "\u{F9FA}"
    /// signal-h
    case signalH = "\u{F9FC}"
    /// signal-h-plus
    case signalHPlus = "\u{F9FB}"
    /// signal-lte
    case signalLte = "\u{F9FD}"
    /// signature
    case signature = "\u{EEE0}"
    /// signature-off
    case signatureOff = "\u{F1A5}"
    /// sitemap
    case sitemap = "\u{EB9D}"
    /// sitemap-off
    case sitemapOff = "\u{F1A6}"
    /// skateboard
    case skateboard = "\u{ECC2}"
    /// skateboard-off
    case skateboardOff = "\u{F42B}"
    /// skateboarding
    case skateboarding = "\u{FACA}"
    /// skew-x
    case skewX = "\u{FD3B}"
    /// skew-y
    case skewY = "\u{FD3C}"
    /// ski-jumping
    case skiJumping = "\u{FA6C}"
    /// skull
    case skull = "\u{F292}"
    /// slash
    case slash = "\u{F4F9}"
    /// slashes
    case slashes = "\u{F588}"
    /// sleigh
    case sleigh = "\u{EF9C}"
    /// slice
    case slice = "\u{EBDB}"
    /// slideshow
    case slideshow = "\u{EBC9}"
    /// smart-home
    case smartHome = "\u{ECDE}"
    /// smart-home-off
    case smartHomeOff = "\u{F1A7}"
    /// smoking
    case smoking = "\u{ECC4}"
    /// smoking-no
    case smokingNo = "\u{ECC3}"
    /// snowboarding
    case snowboarding = "\u{FD4F}"
    /// snowflake
    case snowflake = "\u{EC0B}"
    /// snowflake-off
    case snowflakeOff = "\u{F1A8}"
    /// snowman
    case snowman = "\u{F26D}"
    /// soccer-field
    case soccerField = "\u{ED92}"
    /// social
    case social = "\u{EBEC}"
    /// social-off
    case socialOff = "\u{F1A9}"
    /// sock
    case sock = "\u{EEE1}"
    /// sofa
    case sofa = "\u{EFAF}"
    /// sofa-off
    case sofaOff = "\u{F42C}"
    /// solar-electricity
    case solarElectricity = "\u{FCC1}"
    /// solar-panel
    case solarPanel = "\u{F7BF}"
    /// solar-panel-2
    case solarPanel2 = "\u{F7BE}"
    /// sort-0-9
    case sort09 = "\u{F54D}"
    /// sort-9-0
    case sort90 = "\u{F54E}"
    /// sort-a-z
    case sortAZ = "\u{F54F}"
    /// sort-ascending
    case sortAscending = "\u{EB26}"
    /// sort-ascending-2
    case sortAscending2 = "\u{EEE2}"
    /// sort-ascending-letters
    case sortAscendingLetters = "\u{EF18}"
    /// sort-ascending-numbers
    case sortAscendingNumbers = "\u{EF19}"
    /// sort-ascending-shapes
    case sortAscendingShapes = "\u{FD94}"
    /// sort-ascending-small-big
    case sortAscendingSmallBig = "\u{FD95}"
    /// sort-descending
    case sortDescending = "\u{EB27}"
    /// sort-descending-2
    case sortDescending2 = "\u{EEE3}"
    /// sort-descending-letters
    case sortDescendingLetters = "\u{EF1A}"
    /// sort-descending-numbers
    case sortDescendingNumbers = "\u{EF1B}"
    /// sort-descending-shapes
    case sortDescendingShapes = "\u{FD97}"
    /// sort-descending-small-big
    case sortDescendingSmallBig = "\u{FD96}"
    /// sort-z-a
    case sortZA = "\u{F550}"
    /// sos
    case sos = "\u{F24A}"
    /// soup
    case soup = "\u{EF2E}"
    /// soup-off
    case soupOff = "\u{F42D}"
    /// source-code
    case sourceCode = "\u{F4A2}"
    /// space
    case space = "\u{EC0C}"
    /// space-off
    case spaceOff = "\u{F1AA}"
    /// spaces
    case spaces = "\u{FEA4}"
    /// spacing-horizontal
    case spacingHorizontal = "\u{EF54}"
    /// spacing-vertical
    case spacingVertical = "\u{EF55}"
    /// spade
    case spade = "\u{EFFA}"
    /// sparkles
    case sparkles = "\u{F6D7}"
    /// sparkles-2
    case sparkles2 = "\u{101A6}"
    /// speakerphone
    case speakerphone = "\u{ED61}"
    /// speedboat
    case speedboat = "\u{ED93}"
    /// sphere
    case sphere = "\u{FAB8}"
    /// sphere-off
    case sphereOff = "\u{FAB6}"
    /// sphere-plus
    case spherePlus = "\u{FAB7}"
    /// spider
    case spider = "\u{F293}"
    /// spiral
    case spiral = "\u{F294}"
    /// spiral-off
    case spiralOff = "\u{F42E}"
    /// sport-billard
    case sportBillard = "\u{EEE4}"
    /// spray
    case spray = "\u{F50B}"
    /// spy
    case spy = "\u{F227}"
    /// spy-off
    case spyOff = "\u{F42F}"
    /// sql
    case sql = "\u{F7C0}"
    /// square
    case square = "\u{EB2C}"
    /// square-arrow-down
    case squareArrowDown = "\u{F4B7}"
    /// square-arrow-left
    case squareArrowLeft = "\u{F4B8}"
    /// square-arrow-right
    case squareArrowRight = "\u{F4B9}"
    /// square-arrow-up
    case squareArrowUp = "\u{F4BA}"
    /// square-asterisk
    case squareAsterisk = "\u{F01A}"
    /// square-check
    case squareCheck = "\u{EB28}"
    /// square-chevron-down
    case squareChevronDown = "\u{F627}"
    /// square-chevron-left
    case squareChevronLeft = "\u{F628}"
    /// square-chevron-right
    case squareChevronRight = "\u{F629}"
    /// square-chevron-up
    case squareChevronUp = "\u{F62A}"
    /// square-chevrons-down
    case squareChevronsDown = "\u{F64B}"
    /// square-chevrons-left
    case squareChevronsLeft = "\u{F64C}"
    /// square-chevrons-right
    case squareChevronsRight = "\u{F64D}"
    /// square-chevrons-up
    case squareChevronsUp = "\u{F64E}"
    /// square-dashed
    case squareDashed = "\u{100BB}"
    /// square-dot
    case squareDot = "\u{ED59}"
    /// square-f0
    case squareF0 = "\u{F526}"
    /// square-f1
    case squareF1 = "\u{F527}"
    /// square-f2
    case squareF2 = "\u{F528}"
    /// square-f3
    case squareF3 = "\u{F529}"
    /// square-f4
    case squareF4 = "\u{F52A}"
    /// square-f5
    case squareF5 = "\u{F52B}"
    /// square-f6
    case squareF6 = "\u{F52C}"
    /// square-f7
    case squareF7 = "\u{F52D}"
    /// square-f8
    case squareF8 = "\u{F52E}"
    /// square-f9
    case squareF9 = "\u{F52F}"
    /// square-forbid
    case squareForbid = "\u{ED5B}"
    /// square-forbid-2
    case squareForbid2 = "\u{ED5A}"
    /// square-half
    case squareHalf = "\u{EFFB}"
    /// square-key
    case squareKey = "\u{F638}"
    /// square-letter-a
    case squareLetterA = "\u{F47C}"
    /// square-letter-b
    case squareLetterB = "\u{F47D}"
    /// square-letter-c
    case squareLetterC = "\u{F47E}"
    /// square-letter-d
    case squareLetterD = "\u{F47F}"
    /// square-letter-e
    case squareLetterE = "\u{F480}"
    /// square-letter-f
    case squareLetterF = "\u{F481}"
    /// square-letter-g
    case squareLetterG = "\u{F482}"
    /// square-letter-h
    case squareLetterH = "\u{F483}"
    /// square-letter-i
    case squareLetterI = "\u{F484}"
    /// square-letter-j
    case squareLetterJ = "\u{F485}"
    /// square-letter-k
    case squareLetterK = "\u{F486}"
    /// square-letter-l
    case squareLetterL = "\u{F487}"
    /// square-letter-m
    case squareLetterM = "\u{F488}"
    /// square-letter-n
    case squareLetterN = "\u{F489}"
    /// square-letter-o
    case squareLetterO = "\u{F48A}"
    /// square-letter-p
    case squareLetterP = "\u{F48B}"
    /// square-letter-q
    case squareLetterQ = "\u{F48C}"
    /// square-letter-r
    case squareLetterR = "\u{F48D}"
    /// square-letter-s
    case squareLetterS = "\u{F48E}"
    /// square-letter-t
    case squareLetterT = "\u{F48F}"
    /// square-letter-u
    case squareLetterU = "\u{F490}"
    /// square-letter-v
    case squareLetterV = "\u{F4BB}"
    /// square-letter-w
    case squareLetterW = "\u{F491}"
    /// square-letter-x
    case squareLetterX = "\u{F4BC}"
    /// square-letter-y
    case squareLetterY = "\u{F492}"
    /// square-letter-z
    case squareLetterZ = "\u{F493}"
    /// square-minus
    case squareMinus = "\u{1019E}"
    /// square-minus-2
    case squareMinus2 = "\u{EB29}"
    /// square-number-0
    case squareNumber0 = "\u{EEE5}"
    /// square-number-1
    case squareNumber1 = "\u{EEE6}"
    /// square-number-2
    case squareNumber2 = "\u{EEE7}"
    /// square-number-3
    case squareNumber3 = "\u{EEE8}"
    /// square-number-4
    case squareNumber4 = "\u{EEE9}"
    /// square-number-5
    case squareNumber5 = "\u{EEEA}"
    /// square-number-6
    case squareNumber6 = "\u{EEEB}"
    /// square-number-7
    case squareNumber7 = "\u{EEEC}"
    /// square-number-8
    case squareNumber8 = "\u{EEED}"
    /// square-number-9
    case squareNumber9 = "\u{EEEE}"
    /// square-off
    case squareOff = "\u{EEEF}"
    /// square-percentage
    case squarePercentage = "\u{FD83}"
    /// square-plus
    case squarePlus = "\u{EB2A}"
    /// square-plus-2
    case squarePlus2 = "\u{FC96}"
    /// square-root
    case squareRoot = "\u{EEF1}"
    /// square-root-2
    case squareRoot2 = "\u{EEF0}"
    /// square-rotated
    case squareRotated = "\u{ECDF}"
    /// square-rotated-asterisk
    case squareRotatedAsterisk = "\u{101A5}"
    /// square-rotated-forbid
    case squareRotatedForbid = "\u{F01C}"
    /// square-rotated-forbid-2
    case squareRotatedForbid2 = "\u{F01B}"
    /// square-rotated-off
    case squareRotatedOff = "\u{EEF2}"
    /// square-rounded
    case squareRounded = "\u{F59A}"
    /// square-rounded-arrow-down
    case squareRoundedArrowDown = "\u{F639}"
    /// square-rounded-arrow-left
    case squareRoundedArrowLeft = "\u{F63A}"
    /// square-rounded-arrow-right
    case squareRoundedArrowRight = "\u{F63B}"
    /// square-rounded-arrow-up
    case squareRoundedArrowUp = "\u{F63C}"
    /// square-rounded-check
    case squareRoundedCheck = "\u{F63D}"
    /// square-rounded-chevron-down
    case squareRoundedChevronDown = "\u{F62B}"
    /// square-rounded-chevron-left
    case squareRoundedChevronLeft = "\u{F62C}"
    /// square-rounded-chevron-right
    case squareRoundedChevronRight = "\u{F62D}"
    /// square-rounded-chevron-up
    case squareRoundedChevronUp = "\u{F62E}"
    /// square-rounded-chevrons-down
    case squareRoundedChevronsDown = "\u{F64F}"
    /// square-rounded-chevrons-left
    case squareRoundedChevronsLeft = "\u{F650}"
    /// square-rounded-chevrons-right
    case squareRoundedChevronsRight = "\u{F651}"
    /// square-rounded-chevrons-up
    case squareRoundedChevronsUp = "\u{F652}"
    /// square-rounded-letter-a
    case squareRoundedLetterA = "\u{F5AE}"
    /// square-rounded-letter-b
    case squareRoundedLetterB = "\u{F5AF}"
    /// square-rounded-letter-c
    case squareRoundedLetterC = "\u{F5B0}"
    /// square-rounded-letter-d
    case squareRoundedLetterD = "\u{F5B1}"
    /// square-rounded-letter-e
    case squareRoundedLetterE = "\u{F5B2}"
    /// square-rounded-letter-f
    case squareRoundedLetterF = "\u{F5B3}"
    /// square-rounded-letter-g
    case squareRoundedLetterG = "\u{F5B4}"
    /// square-rounded-letter-h
    case squareRoundedLetterH = "\u{F5B5}"
    /// square-rounded-letter-i
    case squareRoundedLetterI = "\u{F5B6}"
    /// square-rounded-letter-j
    case squareRoundedLetterJ = "\u{F5B7}"
    /// square-rounded-letter-k
    case squareRoundedLetterK = "\u{F5B8}"
    /// square-rounded-letter-l
    case squareRoundedLetterL = "\u{F5B9}"
    /// square-rounded-letter-m
    case squareRoundedLetterM = "\u{F5BA}"
    /// square-rounded-letter-n
    case squareRoundedLetterN = "\u{F5BB}"
    /// square-rounded-letter-o
    case squareRoundedLetterO = "\u{F5BC}"
    /// square-rounded-letter-p
    case squareRoundedLetterP = "\u{F5BD}"
    /// square-rounded-letter-q
    case squareRoundedLetterQ = "\u{F5BE}"
    /// square-rounded-letter-r
    case squareRoundedLetterR = "\u{F5BF}"
    /// square-rounded-letter-s
    case squareRoundedLetterS = "\u{F5C0}"
    /// square-rounded-letter-t
    case squareRoundedLetterT = "\u{F5C1}"
    /// square-rounded-letter-u
    case squareRoundedLetterU = "\u{F5C2}"
    /// square-rounded-letter-v
    case squareRoundedLetterV = "\u{F5C3}"
    /// square-rounded-letter-w
    case squareRoundedLetterW = "\u{F5C4}"
    /// square-rounded-letter-x
    case squareRoundedLetterX = "\u{F5C5}"
    /// square-rounded-letter-y
    case squareRoundedLetterY = "\u{F5C6}"
    /// square-rounded-letter-z
    case squareRoundedLetterZ = "\u{F5C7}"
    /// square-rounded-minus
    case squareRoundedMinus = "\u{F63E}"
    /// square-rounded-minus-2
    case squareRoundedMinus2 = "\u{FC97}"
    /// square-rounded-number-0
    case squareRoundedNumber0 = "\u{F5C8}"
    /// square-rounded-number-1
    case squareRoundedNumber1 = "\u{F5C9}"
    /// square-rounded-number-2
    case squareRoundedNumber2 = "\u{F5CA}"
    /// square-rounded-number-3
    case squareRoundedNumber3 = "\u{F5CB}"
    /// square-rounded-number-4
    case squareRoundedNumber4 = "\u{F5CC}"
    /// square-rounded-number-5
    case squareRoundedNumber5 = "\u{F5CD}"
    /// square-rounded-number-6
    case squareRoundedNumber6 = "\u{F5CE}"
    /// square-rounded-number-7
    case squareRoundedNumber7 = "\u{F5CF}"
    /// square-rounded-number-8
    case squareRoundedNumber8 = "\u{F5D0}"
    /// square-rounded-number-9
    case squareRoundedNumber9 = "\u{F5D1}"
    /// square-rounded-percentage
    case squareRoundedPercentage = "\u{FD84}"
    /// square-rounded-plus
    case squareRoundedPlus = "\u{F63F}"
    /// square-rounded-plus-2
    case squareRoundedPlus2 = "\u{FC98}"
    /// square-rounded-x
    case squareRoundedX = "\u{F640}"
    /// square-toggle
    case squareToggle = "\u{EEF4}"
    /// square-toggle-horizontal
    case squareToggleHorizontal = "\u{EEF3}"
    /// square-x
    case squareX = "\u{EB2B}"
    /// squares
    case squares = "\u{EEF6}"
    /// squares-diagonal
    case squaresDiagonal = "\u{EEF5}"
    /// squares-selected
    case squaresSelected = "\u{FEA3}"
    /// stack
    case stack = "\u{EB2D}"
    /// stack-2
    case stack2 = "\u{EEF7}"
    /// stack-3
    case stack3 = "\u{EF9D}"
    /// stack-back
    case stackBack = "\u{FD26}"
    /// stack-backward
    case stackBackward = "\u{FD27}"
    /// stack-forward
    case stackForward = "\u{FD28}"
    /// stack-front
    case stackFront = "\u{FD29}"
    /// stack-middle
    case stackMiddle = "\u{FD2A}"
    /// stack-pop
    case stackPop = "\u{F234}"
    /// stack-push
    case stackPush = "\u{F235}"
    /// stairs
    case stairs = "\u{ECA6}"
    /// stairs-down
    case stairsDown = "\u{ECA4}"
    /// stairs-up
    case stairsUp = "\u{ECA5}"
    /// star
    case star = "\u{EB2E}"
    /// star-half
    case starHalf = "\u{ED19}"
    /// star-off
    case starOff = "\u{ED62}"
    /// stars
    case stars = "\u{ED38}"
    /// stars-off
    case starsOff = "\u{F430}"
    /// status-change
    case statusChange = "\u{F3B0}"
    /// steam
    case steam = "\u{F24B}"
    /// steering-wheel
    case steeringWheel = "\u{EC7B}"
    /// steering-wheel-off
    case steeringWheelOff = "\u{F431}"
    /// step-into
    case stepInto = "\u{ECE0}"
    /// step-out
    case stepOut = "\u{ECE1}"
    /// stereo-glasses
    case stereoGlasses = "\u{F4CB}"
    /// stethoscope
    case stethoscope = "\u{EDBE}"
    /// stethoscope-off
    case stethoscopeOff = "\u{F432}"
    /// sticker
    case sticker = "\u{EB2F}"
    /// sticker-2
    case sticker2 = "\u{FD3D}"
    /// stopwatch
    case stopwatch = "\u{FF9B}"
    /// storm
    case storm = "\u{F24C}"
    /// storm-off
    case stormOff = "\u{F433}"
    /// stretching
    case stretching = "\u{F2DB}"
    /// stretching-2
    case stretching2 = "\u{FA6D}"
    /// strikethrough
    case strikethrough = "\u{EB9E}"
    /// submarine
    case submarine = "\u{ED94}"
    /// subscript
    case `subscript` = "\u{EB9F}"
    /// subtask
    case subtask = "\u{EC9F}"
    /// subtitles
    case subtitles = "\u{101A1}"
    /// subtitles-ai
    case subtitlesAi = "\u{101A4}"
    /// subtitles-edit
    case subtitlesEdit = "\u{101A3}"
    /// subtitles-off
    case subtitlesOff = "\u{101A2}"
    /// sum
    case sum = "\u{EB73}"
    /// sum-off
    case sumOff = "\u{F1AB}"
    /// sun
    case sun = "\u{EB30}"
    /// sun-electricity
    case sunElectricity = "\u{FCC2}"
    /// sun-high
    case sunHigh = "\u{F236}"
    /// sun-low
    case sunLow = "\u{F237}"
    /// sun-moon
    case sunMoon = "\u{F4A3}"
    /// sun-off
    case sunOff = "\u{ED63}"
    /// sun-wind
    case sunWind = "\u{F238}"
    /// sunglasses
    case sunglasses = "\u{F239}"
    /// sunrise
    case sunrise = "\u{EF1C}"
    /// sunset
    case sunset = "\u{EC31}"
    /// sunset-2
    case sunset2 = "\u{F23A}"
    /// superscript
    case superscript = "\u{EBA0}"
    /// svg
    case svg = "\u{F25A}"
    /// swimming
    case swimming = "\u{EC92}"
    /// swipe
    case swipe = "\u{F551}"
    /// swipe-down
    case swipeDown = "\u{FD5E}"
    /// swipe-left
    case swipeLeft = "\u{FD5F}"
    /// swipe-right
    case swipeRight = "\u{FD60}"
    /// swipe-up
    case swipeUp = "\u{FD61}"
    /// switch
    case `switch` = "\u{EB33}"
    /// switch-2
    case switch2 = "\u{EDBF}"
    /// switch-3
    case switch3 = "\u{EDC0}"
    /// switch-horizontal
    case switchHorizontal = "\u{EB31}"
    /// switch-vertical
    case switchVertical = "\u{EB32}"
    /// sword
    case sword = "\u{F030}"
    /// sword-off
    case swordOff = "\u{F434}"
    /// swords
    case swords = "\u{F132}"
    /// table
    case table = "\u{EBA1}"
    /// table-alias
    case tableAlias = "\u{F25B}"
    /// table-column
    case tableColumn = "\u{FAFF}"
    /// table-dashed
    case tableDashed = "\u{100BA}"
    /// table-down
    case tableDown = "\u{FA1C}"
    /// table-export
    case tableExport = "\u{EEF8}"
    /// table-heart
    case tableHeart = "\u{FA1D}"
    /// table-import
    case tableImport = "\u{EEF9}"
    /// table-minus
    case tableMinus = "\u{FA1E}"
    /// table-off
    case tableOff = "\u{EEFA}"
    /// table-options
    case tableOptions = "\u{F25C}"
    /// table-plus
    case tablePlus = "\u{FA1F}"
    /// table-row
    case tableRow = "\u{FB00}"
    /// table-share
    case tableShare = "\u{FA20}"
    /// table-shortcut
    case tableShortcut = "\u{F25D}"
    /// table-spark
    case tableSpark = "\u{FFAD}"
    /// tag
    case tag = "\u{10096}"
    /// tag-minus
    case tagMinus = "\u{EB34}"
    /// tag-off
    case tagOff = "\u{EFC0}"
    /// tag-plus
    case tagPlus = "\u{10097}"
    /// tag-starred
    case tagStarred = "\u{FC99}"
    /// tags
    case tags = "\u{EF86}"
    /// tags-off
    case tagsOff = "\u{EFC1}"
    /// tallymark-1
    case tallymark1 = "\u{EC46}"
    /// tallymark-2
    case tallymark2 = "\u{EC47}"
    /// tallymark-3
    case tallymark3 = "\u{EC48}"
    /// tallymark-4
    case tallymark4 = "\u{EC49}"
    /// tallymarks
    case tallymarks = "\u{EC4A}"
    /// tank
    case tank = "\u{ED95}"
    /// target
    case target = "\u{EB35}"
    /// target-arrow
    case targetArrow = "\u{F51A}"
    /// target-off
    case targetOff = "\u{F1AD}"
    /// tax
    case tax = "\u{FEEE}"
    /// tax-euro
    case taxEuro = "\u{FEF0}"
    /// tax-pound
    case taxPound = "\u{FEEF}"
    /// teapot
    case teapot = "\u{F552}"
    /// telescope
    case telescope = "\u{F07D}"
    /// telescope-off
    case telescopeOff = "\u{F1AE}"
    /// temperature
    case temperature = "\u{EB38}"
    /// temperature-celsius
    case temperatureCelsius = "\u{EB36}"
    /// temperature-fahrenheit
    case temperatureFahrenheit = "\u{EB37}"
    /// temperature-minus
    case temperatureMinus = "\u{EBED}"
    /// temperature-off
    case temperatureOff = "\u{F1AF}"
    /// temperature-plus
    case temperaturePlus = "\u{EBEE}"
    /// temperature-snow
    case temperatureSnow = "\u{FDA3}"
    /// temperature-sun
    case temperatureSun = "\u{FDA4}"
    /// template
    case template = "\u{EB39}"
    /// template-off
    case templateOff = "\u{F1B0}"
    /// tent
    case tent = "\u{EEFB}"
    /// tent-off
    case tentOff = "\u{F435}"
    /// terminal
    case terminal = "\u{EBDC}"
    /// terminal-2
    case terminal2 = "\u{EBEF}"
    /// test-pipe
    case testPipe = "\u{EB3A}"
    /// test-pipe-2
    case testPipe2 = "\u{F0A4}"
    /// test-pipe-off
    case testPipeOff = "\u{F1B1}"
    /// tex
    case tex = "\u{F4E0}"
    /// text-caption
    case textCaption = "\u{F4A4}"
    /// text-color
    case textColor = "\u{F2DC}"
    /// text-decrease
    case textDecrease = "\u{F202}"
    /// text-direction-ltr
    case textDirectionLtr = "\u{EEFC}"
    /// text-direction-rtl
    case textDirectionRtl = "\u{EEFD}"
    /// text-grammar
    case textGrammar = "\u{FD6D}"
    /// text-increase
    case textIncrease = "\u{F203}"
    /// text-orientation
    case textOrientation = "\u{F2A4}"
    /// text-plus
    case textPlus = "\u{F2A5}"
    /// text-recognition
    case textRecognition = "\u{F204}"
    /// text-resize
    case textResize = "\u{EF87}"
    /// text-scan-2
    case textScan2 = "\u{FCC3}"
    /// text-size
    case textSize = "\u{F2B1}"
    /// text-spellcheck
    case textSpellcheck = "\u{F2A6}"
    /// text-wrap
    case textWrap = "\u{EBDD}"
    /// text-wrap-column
    case textWrapColumn = "\u{FEB2}"
    /// text-wrap-disabled
    case textWrapDisabled = "\u{ECA7}"
    /// texture
    case texture = "\u{F51B}"
    /// theater
    case theater = "\u{F79B}"
    /// thermometer
    case thermometer = "\u{EF67}"
    /// thumb-down
    case thumbDown = "\u{EB3B}"
    /// thumb-down-off
    case thumbDownOff = "\u{F436}"
    /// thumb-up
    case thumbUp = "\u{EB3C}"
    /// thumb-up-off
    case thumbUpOff = "\u{F437}"
    /// tic-tac
    case ticTac = "\u{F51C}"
    /// ticket
    case ticket = "\u{EB3D}"
    /// ticket-off
    case ticketOff = "\u{F1B2}"
    /// tie
    case tie = "\u{F07E}"
    /// tilde
    case tilde = "\u{F4A5}"
    /// tilt-shift
    case tiltShift = "\u{EEFE}"
    /// tilt-shift-off
    case tiltShiftOff = "\u{F1B3}"
    /// time-duration-0
    case timeDuration0 = "\u{FAD4}"
    /// time-duration-10
    case timeDuration10 = "\u{FAD5}"
    /// time-duration-15
    case timeDuration15 = "\u{FAD6}"
    /// time-duration-30
    case timeDuration30 = "\u{FAD7}"
    /// time-duration-45
    case timeDuration45 = "\u{FAD8}"
    /// time-duration-5
    case timeDuration5 = "\u{FAD9}"
    /// time-duration-60
    case timeDuration60 = "\u{FADA}"
    /// time-duration-90
    case timeDuration90 = "\u{FADB}"
    /// time-duration-off
    case timeDurationOff = "\u{FADC}"
    /// timeline
    case timeline = "\u{F031}"
    /// timeline-event
    case timelineEvent = "\u{F553}"
    /// timeline-event-exclamation
    case timelineEventExclamation = "\u{F662}"
    /// timeline-event-minus
    case timelineEventMinus = "\u{F663}"
    /// timeline-event-plus
    case timelineEventPlus = "\u{F664}"
    /// timeline-event-text
    case timelineEventText = "\u{F665}"
    /// timeline-event-x
    case timelineEventX = "\u{F666}"
    /// timezone
    case timezone = "\u{FEED}"
    /// tip-jar
    case tipJar = "\u{FEEA}"
    /// tip-jar-euro
    case tipJarEuro = "\u{FEEC}"
    /// tip-jar-pound
    case tipJarPound = "\u{FEEB}"
    /// tir
    case tir = "\u{EBF0}"
    /// toggle-left
    case toggleLeft = "\u{EB3E}"
    /// toggle-right
    case toggleRight = "\u{EB3F}"
    /// toilet-paper
    case toiletPaper = "\u{EFD3}"
    /// toilet-paper-off
    case toiletPaperOff = "\u{F1B4}"
    /// toml
    case toml = "\u{FA5D}"
    /// tool
    case tool = "\u{EB40}"
    /// tools
    case tools = "\u{EBCA}"
    /// tools-kitchen
    case toolsKitchen = "\u{ED64}"
    /// tools-kitchen-2
    case toolsKitchen2 = "\u{EEFF}"
    /// tools-kitchen-2-off
    case toolsKitchen2Off = "\u{F1B5}"
    /// tools-kitchen-3
    case toolsKitchen3 = "\u{FD2B}"
    /// tools-kitchen-off
    case toolsKitchenOff = "\u{F1B6}"
    /// tools-off
    case toolsOff = "\u{F1B7}"
    /// tooltip
    case tooltip = "\u{F2DD}"
    /// topology-bus
    case topologyBus = "\u{F5D9}"
    /// topology-complex
    case topologyComplex = "\u{F5DA}"
    /// topology-full
    case topologyFull = "\u{F5DC}"
    /// topology-full-hierarchy
    case topologyFullHierarchy = "\u{F5DB}"
    /// topology-ring
    case topologyRing = "\u{F5DF}"
    /// topology-ring-2
    case topologyRing2 = "\u{F5DD}"
    /// topology-ring-3
    case topologyRing3 = "\u{F5DE}"
    /// topology-star
    case topologyStar = "\u{F5E5}"
    /// topology-star-2
    case topologyStar2 = "\u{F5E0}"
    /// topology-star-3
    case topologyStar3 = "\u{F5E1}"
    /// topology-star-ring
    case topologyStarRing = "\u{F5E4}"
    /// topology-star-ring-2
    case topologyStarRing2 = "\u{F5E2}"
    /// topology-star-ring-3
    case topologyStarRing3 = "\u{F5E3}"
    /// torii
    case torii = "\u{F59B}"
    /// tornado
    case tornado = "\u{ECE2}"
    /// tournament
    case tournament = "\u{ECD0}"
    /// tower
    case tower = "\u{F2CB}"
    /// tower-off
    case towerOff = "\u{F2CA}"
    /// track
    case track = "\u{EF00}"
    /// tractor
    case tractor = "\u{EC0D}"
    /// trademark
    case trademark = "\u{EC0E}"
    /// traffic-cone
    case trafficCone = "\u{EC0F}"
    /// traffic-cone-off
    case trafficConeOff = "\u{F1B8}"
    /// traffic-lights
    case trafficLights = "\u{ED39}"
    /// traffic-lights-off
    case trafficLightsOff = "\u{F1B9}"
    /// train
    case train = "\u{ED96}"
    /// transaction-bitcoin
    case transactionBitcoin = "\u{FD6E}"
    /// transaction-dollar
    case transactionDollar = "\u{FD6F}"
    /// transaction-euro
    case transactionEuro = "\u{FD70}"
    /// transaction-pound
    case transactionPound = "\u{FD71}"
    /// transaction-rupee
    case transactionRupee = "\u{FD85}"
    /// transaction-yen
    case transactionYen = "\u{FD72}"
    /// transaction-yuan
    case transactionYuan = "\u{FD73}"
    /// transfer
    case transfer = "\u{FC1F}"
    /// transfer-in
    case transferIn = "\u{EF2F}"
    /// transfer-out
    case transferOut = "\u{EF30}"
    /// transfer-vertical
    case transferVertical = "\u{FC1E}"
    /// transform
    case transform = "\u{F38E}"
    /// transform-point
    case transformPoint = "\u{FDA9}"
    /// transform-point-bottom-left
    case transformPointBottomLeft = "\u{FDA5}"
    /// transform-point-bottom-right
    case transformPointBottomRight = "\u{FDA6}"
    /// transform-point-top-left
    case transformPointTopLeft = "\u{FDA7}"
    /// transform-point-top-right
    case transformPointTopRight = "\u{FDA8}"
    /// transition-bottom
    case transitionBottom = "\u{F2B2}"
    /// transition-left
    case transitionLeft = "\u{F2B3}"
    /// transition-right
    case transitionRight = "\u{F2B4}"
    /// transition-top
    case transitionTop = "\u{F2B5}"
    /// trash
    case trash = "\u{EB41}"
    /// trash-off
    case trashOff = "\u{ED65}"
    /// trash-x
    case trashX = "\u{EF88}"
    /// treadmill
    case treadmill = "\u{FA6E}"
    /// tree
    case tree = "\u{EF01}"
    /// trees
    case trees = "\u{EC10}"
    /// trekking
    case trekking = "\u{F5AD}"
    /// trending-down
    case trendingDown = "\u{EB42}"
    /// trending-down-2
    case trendingDown2 = "\u{EDC1}"
    /// trending-down-3
    case trendingDown3 = "\u{EDC2}"
    /// trending-up
    case trendingUp = "\u{EB43}"
    /// trending-up-2
    case trendingUp2 = "\u{EDC3}"
    /// trending-up-3
    case trendingUp3 = "\u{EDC4}"
    /// triangle
    case triangle = "\u{EB44}"
    /// triangle-inverted
    case triangleInverted = "\u{F01D}"
    /// triangle-minus
    case triangleMinus = "\u{FC9B}"
    /// triangle-minus-2
    case triangleMinus2 = "\u{FC9A}"
    /// triangle-off
    case triangleOff = "\u{EF02}"
    /// triangle-plus
    case trianglePlus = "\u{FC9D}"
    /// triangle-plus-2
    case trianglePlus2 = "\u{FC9C}"
    /// triangle-square-circle
    case triangleSquareCircle = "\u{ECE8}"
    /// triangles
    case triangles = "\u{F0A5}"
    /// trident
    case trident = "\u{ECC5}"
    /// trolley
    case trolley = "\u{F4CC}"
    /// trophy
    case trophy = "\u{EB45}"
    /// trophy-off
    case trophyOff = "\u{F438}"
    /// trowel
    case trowel = "\u{F368}"
    /// truck
    case truck = "\u{EBC4}"
    /// truck-delivery
    case truckDelivery = "\u{EC4B}"
    /// truck-loading
    case truckLoading = "\u{F1DA}"
    /// truck-off
    case truckOff = "\u{EF03}"
    /// truck-return
    case truckReturn = "\u{EC4C}"
    /// txt
    case txt = "\u{F3B1}"
    /// typeface
    case typeface = "\u{FDAB}"
    /// typography
    case typography = "\u{EBC5}"
    /// typography-off
    case typographyOff = "\u{F1BA}"
    /// u-turn-left
    case uTurnLeft = "\u{FEA2}"
    /// u-turn-right
    case uTurnRight = "\u{FEA1}"
    /// ufo
    case ufo = "\u{F26F}"
    /// ufo-off
    case ufoOff = "\u{F26E}"
    /// uhd
    case uhd = "\u{100AA}"
    /// umbrella
    case umbrella = "\u{EBF1}"
    /// umbrella-2
    case umbrella2 = "\u{FF0E}"
    /// umbrella-closed
    case umbrellaClosed = "\u{FF0C}"
    /// umbrella-closed-2
    case umbrellaClosed2 = "\u{FF0D}"
    /// umbrella-off
    case umbrellaOff = "\u{F1BB}"
    /// underline
    case underline = "\u{EBA2}"
    /// universe
    case universe = "\u{FCC4}"
    /// unlink
    case unlink = "\u{EB46}"
    /// upload
    case upload = "\u{EB47}"
    /// urgent
    case urgent = "\u{EB48}"
    /// usb
    case usb = "\u{F00C}"
    /// user
    case user = "\u{EB4D}"
    /// user-bitcoin
    case userBitcoin = "\u{FF30}"
    /// user-bolt
    case userBolt = "\u{F9D1}"
    /// user-cancel
    case userCancel = "\u{F9D2}"
    /// user-check
    case userCheck = "\u{EB49}"
    /// user-circle
    case userCircle = "\u{EF68}"
    /// user-code
    case userCode = "\u{F9D3}"
    /// user-cog
    case userCog = "\u{F9D4}"
    /// user-dollar
    case userDollar = "\u{F9D5}"
    /// user-down
    case userDown = "\u{F9D6}"
    /// user-edit
    case userEdit = "\u{F7CC}"
    /// user-exclamation
    case userExclamation = "\u{EC12}"
    /// user-heart
    case userHeart = "\u{F7CD}"
    /// user-hexagon
    case userHexagon = "\u{FC4E}"
    /// user-minus
    case userMinus = "\u{EB4A}"
    /// user-off
    case userOff = "\u{ECF9}"
    /// user-pause
    case userPause = "\u{F9D7}"
    /// user-pentagon
    case userPentagon = "\u{FC4F}"
    /// user-pin
    case userPin = "\u{F7CE}"
    /// user-plus
    case userPlus = "\u{EB4B}"
    /// user-question
    case userQuestion = "\u{F7CF}"
    /// user-scan
    case userScan = "\u{FCAF}"
    /// user-screen
    case userScreen = "\u{FEA0}"
    /// user-search
    case userSearch = "\u{EF89}"
    /// user-share
    case userShare = "\u{F9D8}"
    /// user-shield
    case userShield = "\u{F7D0}"
    /// user-square
    case userSquare = "\u{FC51}"
    /// user-square-rounded
    case userSquareRounded = "\u{FC50}"
    /// user-star
    case userStar = "\u{F7D1}"
    /// user-up
    case userUp = "\u{F7D2}"
    /// user-x
    case userX = "\u{EB4C}"
    /// users
    case users = "\u{EBF2}"
    /// users-group
    case usersGroup = "\u{FA21}"
    /// users-minus
    case usersMinus = "\u{FA0E}"
    /// users-plus
    case usersPlus = "\u{FA0F}"
    /// uv-index
    case uvIndex = "\u{F3B2}"
    /// ux-circle
    case uxCircle = "\u{F369}"
    /// vaccine
    case vaccine = "\u{EF04}"
    /// vaccine-bottle
    case vaccineBottle = "\u{EF69}"
    /// vaccine-bottle-off
    case vaccineBottleOff = "\u{F439}"
    /// vaccine-off
    case vaccineOff = "\u{F1BC}"
    /// vacuum-cleaner
    case vacuumCleaner = "\u{F5E6}"
    /// variable
    case variable = "\u{EF05}"
    /// variable-minus
    case variableMinus = "\u{F36A}"
    /// variable-off
    case variableOff = "\u{F1BD}"
    /// variable-plus
    case variablePlus = "\u{F36B}"
    /// vector
    case vector = "\u{ECA9}"
    /// vector-bezier
    case vectorBezier = "\u{EF1D}"
    /// vector-bezier-2
    case vectorBezier2 = "\u{F1A3}"
    /// vector-bezier-arc
    case vectorBezierArc = "\u{F4CD}"
    /// vector-bezier-circle
    case vectorBezierCircle = "\u{F4CE}"
    /// vector-off
    case vectorOff = "\u{F1BE}"
    /// vector-spline
    case vectorSpline = "\u{F565}"
    /// vector-triangle
    case vectorTriangle = "\u{ECA8}"
    /// vector-triangle-off
    case vectorTriangleOff = "\u{F1BF}"
    /// venus
    case venus = "\u{EC86}"
    /// versions
    case versions = "\u{ED52}"
    /// versions-off
    case versionsOff = "\u{F1C0}"
    /// video
    case video = "\u{ED22}"
    /// video-minus
    case videoMinus = "\u{ED1F}"
    /// video-off
    case videoOff = "\u{ED20}"
    /// video-plus
    case videoPlus = "\u{ED21}"
    /// view-360
    case view360 = "\u{ED84}"
    /// view-360-arrow
    case view360Arrow = "\u{F62F}"
    /// view-360-number
    case view360Number = "\u{F566}"
    /// view-360-off
    case view360Off = "\u{F1C1}"
    /// viewfinder
    case viewfinder = "\u{EB4E}"
    /// viewfinder-off
    case viewfinderOff = "\u{F1C2}"
    /// viewport-narrow
    case viewportNarrow = "\u{EBF3}"
    /// viewport-short
    case viewportShort = "\u{FEE9}"
    /// viewport-tall
    case viewportTall = "\u{FEE8}"
    /// viewport-wide
    case viewportWide = "\u{EBF4}"
    /// vinyl
    case vinyl = "\u{F00D}"
    /// vip
    case vip = "\u{F3B3}"
    /// vip-off
    case vipOff = "\u{F43A}"
    /// virus
    case virus = "\u{EB74}"
    /// virus-off
    case virusOff = "\u{ED66}"
    /// virus-search
    case virusSearch = "\u{ED67}"
    /// vocabulary
    case vocabulary = "\u{EF1E}"
    /// vocabulary-off
    case vocabularyOff = "\u{F43B}"
    /// volcano
    case volcano = "\u{F79C}"
    /// volume
    case volume = "\u{EB51}"
    /// volume-2
    case volume2 = "\u{EB4F}"
    /// volume-3
    case volume3 = "\u{EB50}"
    /// volume-4
    case volume4 = "\u{1019D}"
    /// volume-off
    case volumeOff = "\u{F1C3}"
    /// vs
    case vs = "\u{FC52}"
    /// walk
    case walk = "\u{EC87}"
    /// wall
    case wall = "\u{EF7A}"
    /// wall-off
    case wallOff = "\u{F43C}"
    /// wallet
    case wallet = "\u{EB75}"
    /// wallet-off
    case walletOff = "\u{F1C4}"
    /// wallpaper
    case wallpaper = "\u{EF56}"
    /// wallpaper-off
    case wallpaperOff = "\u{F1C5}"
    /// wand
    case wand = "\u{EBCB}"
    /// wand-off
    case wandOff = "\u{F1C6}"
    /// wash
    case wash = "\u{F311}"
    /// wash-dry
    case washDry = "\u{F304}"
    /// wash-dry-1
    case washDry1 = "\u{F2FA}"
    /// wash-dry-2
    case washDry2 = "\u{F2FB}"
    /// wash-dry-3
    case washDry3 = "\u{F2FC}"
    /// wash-dry-a
    case washDryA = "\u{F2FD}"
    /// wash-dry-dip
    case washDryDip = "\u{F2FE}"
    /// wash-dry-f
    case washDryF = "\u{F2FF}"
    /// wash-dry-flat
    case washDryFlat = "\u{FA7F}"
    /// wash-dry-hang
    case washDryHang = "\u{F300}"
    /// wash-dry-off
    case washDryOff = "\u{F301}"
    /// wash-dry-p
    case washDryP = "\u{F302}"
    /// wash-dry-shade
    case washDryShade = "\u{F303}"
    /// wash-dry-w
    case washDryW = "\u{F322}"
    /// wash-dryclean
    case washDryclean = "\u{F305}"
    /// wash-dryclean-off
    case washDrycleanOff = "\u{F323}"
    /// wash-eco
    case washEco = "\u{FA80}"
    /// wash-gentle
    case washGentle = "\u{F306}"
    /// wash-hand
    case washHand = "\u{FA81}"
    /// wash-machine
    case washMachine = "\u{F25E}"
    /// wash-off
    case washOff = "\u{F307}"
    /// wash-press
    case washPress = "\u{F308}"
    /// wash-temperature-1
    case washTemperature1 = "\u{F309}"
    /// wash-temperature-2
    case washTemperature2 = "\u{F30A}"
    /// wash-temperature-3
    case washTemperature3 = "\u{F30B}"
    /// wash-temperature-4
    case washTemperature4 = "\u{F30C}"
    /// wash-temperature-5
    case washTemperature5 = "\u{F30D}"
    /// wash-temperature-6
    case washTemperature6 = "\u{F30E}"
    /// wash-tumble-dry
    case washTumbleDry = "\u{F30F}"
    /// wash-tumble-off
    case washTumbleOff = "\u{F310}"
    /// waterpolo
    case waterpolo = "\u{FA6F}"
    /// wave-saw-tool
    case waveSawTool = "\u{ECD3}"
    /// wave-sine
    case waveSine = "\u{ECD4}"
    /// wave-square
    case waveSquare = "\u{ECD5}"
    /// waves-electricity
    case wavesElectricity = "\u{FCC5}"
    /// webhook
    case webhook = "\u{F01E}"
    /// webhook-off
    case webhookOff = "\u{F43D}"
    /// weight
    case weight = "\u{F589}"
    /// wheat
    case wheat = "\u{100A8}"
    /// wheat-off
    case wheatOff = "\u{100A9}"
    /// wheel
    case wheel = "\u{FC64}"
    /// wheelchair
    case wheelchair = "\u{F1DB}"
    /// wheelchair-off
    case wheelchairOff = "\u{F43E}"
    /// whirl
    case whirl = "\u{F51D}"
    /// whisk
    case whisk = "\u{101A0}"
    /// wifi
    case wifi = "\u{EB52}"
    /// wifi-0
    case wifi0 = "\u{EBA3}"
    /// wifi-1
    case wifi1 = "\u{EBA4}"
    /// wifi-2
    case wifi2 = "\u{EBA5}"
    /// wifi-off
    case wifiOff = "\u{ECFA}"
    /// wind
    case wind = "\u{EC34}"
    /// wind-electricity
    case windElectricity = "\u{FCC6}"
    /// wind-off
    case windOff = "\u{F1C7}"
    /// windmill
    case windmill = "\u{ED85}"
    /// windmill-off
    case windmillOff = "\u{F1C8}"
    /// window
    case window = "\u{EF06}"
    /// window-maximize
    case windowMaximize = "\u{F1F1}"
    /// window-minimize
    case windowMinimize = "\u{F1F2}"
    /// window-off
    case windowOff = "\u{F1C9}"
    /// windsock
    case windsock = "\u{F06D}"
    /// wiper
    case wiper = "\u{ECAB}"
    /// wiper-wash
    case wiperWash = "\u{ECAA}"
    /// woman
    case woman = "\u{EB53}"
    /// wood
    case wood = "\u{F359}"
    /// world
    case world = "\u{EB54}"
    /// world-bolt
    case worldBolt = "\u{F9D9}"
    /// world-cancel
    case worldCancel = "\u{F9DA}"
    /// world-check
    case worldCheck = "\u{F9DB}"
    /// world-code
    case worldCode = "\u{F9DC}"
    /// world-cog
    case worldCog = "\u{F9DD}"
    /// world-dollar
    case worldDollar = "\u{F9DE}"
    /// world-down
    case worldDown = "\u{F9DF}"
    /// world-download
    case worldDownload = "\u{EF8A}"
    /// world-exclamation
    case worldExclamation = "\u{F9E0}"
    /// world-heart
    case worldHeart = "\u{F9E1}"
    /// world-latitude
    case worldLatitude = "\u{ED2E}"
    /// world-longitude
    case worldLongitude = "\u{ED2F}"
    /// world-minus
    case worldMinus = "\u{F9E2}"
    /// world-off
    case worldOff = "\u{F1CA}"
    /// world-pause
    case worldPause = "\u{F9E3}"
    /// world-pin
    case worldPin = "\u{F9E4}"
    /// world-plus
    case worldPlus = "\u{F9E5}"
    /// world-question
    case worldQuestion = "\u{F9E6}"
    /// world-search
    case worldSearch = "\u{F9E7}"
    /// world-share
    case worldShare = "\u{F9E8}"
    /// world-star
    case worldStar = "\u{F9E9}"
    /// world-up
    case worldUp = "\u{F9EA}"
    /// world-upload
    case worldUpload = "\u{EF8B}"
    /// world-www
    case worldWww = "\u{F38F}"
    /// world-x
    case worldX = "\u{F9EB}"
    /// wrecking-ball
    case wreckingBall = "\u{ED97}"
    /// writing
    case writing = "\u{EF08}"
    /// writing-off
    case writingOff = "\u{F1CB}"
    /// writing-sign
    case writingSign = "\u{EF07}"
    /// writing-sign-off
    case writingSignOff = "\u{F1CC}"
    /// x
    case x = "\u{EB55}"
    /// x-power-y
    case xPowerY = "\u{10072}"
    /// xbox-a
    case xboxA = "\u{F2B6}"
    /// xbox-b
    case xboxB = "\u{F2B7}"
    /// xbox-x
    case xboxX = "\u{F2B8}"
    /// xbox-y
    case xboxY = "\u{F2B9}"
    /// xd
    case xd = "\u{FA33}"
    /// xxx
    case xxx = "\u{FC20}"
    /// yin-yang
    case yinYang = "\u{EC35}"
    /// yoga
    case yoga = "\u{F01F}"
    /// zeppelin
    case zeppelin = "\u{F270}"
    /// zeppelin-off
    case zeppelinOff = "\u{F43F}"
    /// zip
    case zip = "\u{F3B4}"
    /// zodiac-aquarius
    case zodiacAquarius = "\u{ECAC}"
    /// zodiac-aries
    case zodiacAries = "\u{ECAD}"
    /// zodiac-cancer
    case zodiacCancer = "\u{ECAE}"
    /// zodiac-capricorn
    case zodiacCapricorn = "\u{ECAF}"
    /// zodiac-gemini
    case zodiacGemini = "\u{ECB0}"
    /// zodiac-leo
    case zodiacLeo = "\u{ECB1}"
    /// zodiac-libra
    case zodiacLibra = "\u{ECB2}"
    /// zodiac-pisces
    case zodiacPisces = "\u{ECB3}"
    /// zodiac-sagittarius
    case zodiacSagittarius = "\u{ECB4}"
    /// zodiac-scorpio
    case zodiacScorpio = "\u{ECB5}"
    /// zodiac-taurus
    case zodiacTaurus = "\u{ECB6}"
    /// zodiac-virgo
    case zodiacVirgo = "\u{ECB7}"
    /// zoom
    case zoom = "\u{FDAA}"
    /// zoom-cancel
    case zoomCancel = "\u{EC4D}"
    /// zoom-check
    case zoomCheck = "\u{EF09}"
    /// zoom-code
    case zoomCode = "\u{F07F}"
    /// zoom-exclamation
    case zoomExclamation = "\u{F080}"
    /// zoom-in
    case zoomIn = "\u{EB56}"
    /// zoom-in-area
    case zoomInArea = "\u{F1DC}"
    /// zoom-money
    case zoomMoney = "\u{EF0A}"
    /// zoom-out
    case zoomOut = "\u{EB57}"
    /// zoom-out-area
    case zoomOutArea = "\u{F1DD}"
    /// zoom-pan
    case zoomPan = "\u{F1DE}"
    /// zoom-question
    case zoomQuestion = "\u{EDEB}"
    /// zoom-replace
    case zoomReplace = "\u{F2A7}"
    /// zoom-reset
    case zoomReset = "\u{F295}"
    /// zoom-scan
    case zoomScan = "\u{FCB0}"
    /// zzz
    case zzz = "\u{F228}"
    /// zzz-off
    case zzzOff = "\u{F440}"
}

extension TablerIconOutline {
    /// Alias for `hours12`
    public static var _12Hours: TablerIconOutline { .hours12 }
    /// Alias for `number123`
    public static var _123: TablerIconOutline { .number123 }
    /// Alias for `hours24`
    public static var _24Hours: TablerIconOutline { .hours24 }
    /// Alias for `auth2fa`
    public static var _2fa: TablerIconOutline { .auth2fa }
    /// Alias for `view360Arrow`
    public static var _360: TablerIconOutline { .view360Arrow }
    /// Alias for `view360Number`
    public static var _360View: TablerIconOutline { .view360Number }
    /// Alias for `cube3dSphere`
    public static var _3dCubeSphere: TablerIconOutline { .cube3dSphere }
    /// Alias for `cube3dSphereOff`
    public static var _3dCubeSphereOff: TablerIconOutline { .cube3dSphereOff }
    /// Alias for `rotate3d`
    public static var _3dRotate: TablerIconOutline { .rotate3d }
    /// Alias for `package`
    public static var boxSeam: TablerIconOutline { .package }
    /// Alias for `brandAdobePremiere`
    public static var brandAdobePremier: TablerIconOutline { .brandAdobePremiere }
    /// Alias for `circleNumber0`
    public static var circle0: TablerIconOutline { .circleNumber0 }
    /// Alias for `circleNumber1`
    public static var circle1: TablerIconOutline { .circleNumber1 }
    /// Alias for `circleNumber2`
    public static var circle2: TablerIconOutline { .circleNumber2 }
    /// Alias for `circleNumber3`
    public static var circle3: TablerIconOutline { .circleNumber3 }
    /// Alias for `circleNumber4`
    public static var circle4: TablerIconOutline { .circleNumber4 }
    /// Alias for `circleNumber5`
    public static var circle5: TablerIconOutline { .circleNumber5 }
    /// Alias for `circleNumber6`
    public static var circle6: TablerIconOutline { .circleNumber6 }
    /// Alias for `circleNumber7`
    public static var circle7: TablerIconOutline { .circleNumber7 }
    /// Alias for `circleNumber8`
    public static var circle8: TablerIconOutline { .circleNumber8 }
    /// Alias for `circleNumber9`
    public static var circle9: TablerIconOutline { .circleNumber9 }
    /// Alias for `circleDashedLetterV`
    public static var circleDashedLetterLetterV: TablerIconOutline { .circleDashedLetterV }
    /// Alias for `codeAsterisk`
    public static var codeAsterix: TablerIconOutline { .codeAsterisk }
    /// Alias for `rosetteDiscount`
    public static var discount2: TablerIconOutline { .rosetteDiscount }
    /// Alias for `rosetteDiscountOff`
    public static var discount2Off: TablerIconOutline { .rosetteDiscountOff }
    /// Alias for `rosetteDiscountCheck`
    public static var discountCheck: TablerIconOutline { .rosetteDiscountCheck }
    /// Alias for `handLoveYou`
    public static var handRock: TablerIconOutline { .handLoveYou }
    /// Alias for `hexagonNumber0`
    public static var hexagon0: TablerIconOutline { .hexagonNumber0 }
    /// Alias for `hexagonNumber1`
    public static var hexagon1: TablerIconOutline { .hexagonNumber1 }
    /// Alias for `hexagonNumber2`
    public static var hexagon2: TablerIconOutline { .hexagonNumber2 }
    /// Alias for `hexagonNumber3`
    public static var hexagon3: TablerIconOutline { .hexagonNumber3 }
    /// Alias for `hexagonNumber4`
    public static var hexagon4: TablerIconOutline { .hexagonNumber4 }
    /// Alias for `hexagonNumber5`
    public static var hexagon5: TablerIconOutline { .hexagonNumber5 }
    /// Alias for `hexagonNumber6`
    public static var hexagon6: TablerIconOutline { .hexagonNumber6 }
    /// Alias for `hexagonNumber7`
    public static var hexagon7: TablerIconOutline { .hexagonNumber7 }
    /// Alias for `hexagonNumber8`
    public static var hexagon8: TablerIconOutline { .hexagonNumber8 }
    /// Alias for `hexagonNumber9`
    public static var hexagon9: TablerIconOutline { .hexagonNumber9 }
    /// Alias for `kerning`
    public static var kering: TablerIconOutline { .kerning }
    /// Alias for `messageCircle`
    public static var messageCircle2: TablerIconOutline { .messageCircle }
    /// Alias for `moodSurprised`
    public static var moodSuprised: TablerIconOutline { .moodSurprised }
    /// Alias for `seedling`
    public static var seeding: TablerIconOutline { .seedling }
    /// Alias for `seedlingOff`
    public static var seedingOff: TablerIconOutline { .seedlingOff }
    /// Alias for `skiJumping`
    public static var shiJumping: TablerIconOutline { .skiJumping }
    /// Alias for `sortDescendingSmallBig`
    public static var sortDeacendingSmallBig: TablerIconOutline { .sortDescendingSmallBig }
    /// Alias for `squareNumber0`
    public static var square0: TablerIconOutline { .squareNumber0 }
    /// Alias for `squareNumber1`
    public static var square1: TablerIconOutline { .squareNumber1 }
    /// Alias for `squareNumber2`
    public static var square2: TablerIconOutline { .squareNumber2 }
    /// Alias for `squareNumber3`
    public static var square3: TablerIconOutline { .squareNumber3 }
    /// Alias for `squareNumber4`
    public static var square4: TablerIconOutline { .squareNumber4 }
    /// Alias for `squareNumber5`
    public static var square5: TablerIconOutline { .squareNumber5 }
    /// Alias for `squareNumber6`
    public static var square6: TablerIconOutline { .squareNumber6 }
    /// Alias for `squareNumber7`
    public static var square7: TablerIconOutline { .squareNumber7 }
    /// Alias for `squareNumber8`
    public static var square8: TablerIconOutline { .squareNumber8 }
    /// Alias for `squareNumber9`
    public static var square9: TablerIconOutline { .squareNumber9 }
}

// MARK: - Filled Icons

/// Tabler filled icons. Use with the "tabler-icons-filled" font.
public enum TablerIconFilled: String, CaseIterable, Sendable {
    /// accessible
    case accessible = "\u{F6EA}"
    /// ad
    case ad = "\u{F6EB}"
    /// ad-circle
    case adCircle = "\u{F7D3}"
    /// adjustments
    case adjustments = "\u{F6EC}"
    /// aerial-lift
    case aerialLift = "\u{10101}"
    /// affiliate
    case affiliate = "\u{F6ED}"
    /// air-balloon
    case airBalloon = "\u{10100}"
    /// alarm
    case alarm = "\u{F709}"
    /// alarm-minus
    case alarmMinus = "\u{F70A}"
    /// alarm-plus
    case alarmPlus = "\u{F70B}"
    /// alarm-snooze
    case alarmSnooze = "\u{F70C}"
    /// alert-circle
    case alertCircle = "\u{F6EE}"
    /// alert-hexagon
    case alertHexagon = "\u{FA34}"
    /// alert-octagon
    case alertOctagon = "\u{F6EF}"
    /// alert-square
    case alertSquare = "\u{FA35}"
    /// alert-square-rounded
    case alertSquareRounded = "\u{FA36}"
    /// alert-triangle
    case alertTriangle = "\u{F6F0}"
    /// alien
    case alien = "\u{F70D}"
    /// align-box-bottom-center
    case alignBoxBottomCenter = "\u{F70E}"
    /// align-box-bottom-left
    case alignBoxBottomLeft = "\u{F70F}"
    /// align-box-bottom-right
    case alignBoxBottomRight = "\u{F710}"
    /// align-box-center-middle
    case alignBoxCenterMiddle = "\u{F7D4}"
    /// align-box-left-bottom
    case alignBoxLeftBottom = "\u{F711}"
    /// align-box-left-middle
    case alignBoxLeftMiddle = "\u{F712}"
    /// align-box-left-top
    case alignBoxLeftTop = "\u{F713}"
    /// align-box-right-bottom
    case alignBoxRightBottom = "\u{F714}"
    /// align-box-right-middle
    case alignBoxRightMiddle = "\u{F7D5}"
    /// align-box-right-top
    case alignBoxRightTop = "\u{F715}"
    /// align-box-top-center
    case alignBoxTopCenter = "\u{F716}"
    /// align-box-top-left
    case alignBoxTopLeft = "\u{F717}"
    /// align-box-top-right
    case alignBoxTopRight = "\u{F718}"
    /// analyze
    case analyze = "\u{F719}"
    /// app-window
    case appWindow = "\u{F71A}"
    /// apple
    case apple = "\u{10017}"
    /// apps
    case apps = "\u{F6F1}"
    /// archive
    case archive = "\u{FA82}"
    /// arrow-autofit-content
    case arrowAutofitContent = "\u{F6F2}"
    /// arrow-autofit-down
    case arrowAutofitDown = "\u{10113}"
    /// arrow-autofit-height
    case arrowAutofitHeight = "\u{10112}"
    /// arrow-autofit-left
    case arrowAutofitLeft = "\u{10111}"
    /// arrow-autofit-right
    case arrowAutofitRight = "\u{10110}"
    /// arrow-autofit-up
    case arrowAutofitUp = "\u{1010F}"
    /// arrow-autofit-width
    case arrowAutofitWidth = "\u{1010E}"
    /// arrow-badge-down
    case arrowBadgeDown = "\u{F7D6}"
    /// arrow-badge-left
    case arrowBadgeLeft = "\u{F7D7}"
    /// arrow-badge-right
    case arrowBadgeRight = "\u{F7D8}"
    /// arrow-badge-up
    case arrowBadgeUp = "\u{F7D9}"
    /// arrow-big-down
    case arrowBigDown = "\u{F6C6}"
    /// arrow-big-down-line
    case arrowBigDownLine = "\u{F6C7}"
    /// arrow-big-down-lines
    case arrowBigDownLines = "\u{F6C8}"
    /// arrow-big-left
    case arrowBigLeft = "\u{F6C9}"
    /// arrow-big-left-line
    case arrowBigLeftLine = "\u{F6CA}"
    /// arrow-big-left-lines
    case arrowBigLeftLines = "\u{F6CB}"
    /// arrow-big-right
    case arrowBigRight = "\u{F6CC}"
    /// arrow-big-right-line
    case arrowBigRightLine = "\u{F6CD}"
    /// arrow-big-right-lines
    case arrowBigRightLines = "\u{F6CE}"
    /// arrow-big-up
    case arrowBigUp = "\u{F6CF}"
    /// arrow-big-up-line
    case arrowBigUpLine = "\u{F6D0}"
    /// arrow-big-up-lines
    case arrowBigUpLines = "\u{F6D1}"
    /// arrow-down-circle
    case arrowDownCircle = "\u{1003B}"
    /// arrow-down-rhombus
    case arrowDownRhombus = "\u{1003A}"
    /// arrow-down-square
    case arrowDownSquare = "\u{10039}"
    /// arrow-guide
    case arrowGuide = "\u{10038}"
    /// arrow-left-circle
    case arrowLeftCircle = "\u{10037}"
    /// arrow-left-rhombus
    case arrowLeftRhombus = "\u{10036}"
    /// arrow-left-square
    case arrowLeftSquare = "\u{10035}"
    /// arrow-move-down
    case arrowMoveDown = "\u{10034}"
    /// arrow-move-left
    case arrowMoveLeft = "\u{10033}"
    /// arrow-move-right
    case arrowMoveRight = "\u{10032}"
    /// arrow-move-up
    case arrowMoveUp = "\u{10031}"
    /// arrow-right-circle
    case arrowRightCircle = "\u{10030}"
    /// arrow-right-rhombus
    case arrowRightRhombus = "\u{1002F}"
    /// arrow-right-square
    case arrowRightSquare = "\u{1002E}"
    /// arrow-up-circle
    case arrowUpCircle = "\u{1002D}"
    /// arrow-up-rhombus
    case arrowUpRhombus = "\u{1002C}"
    /// arrow-up-square
    case arrowUpSquare = "\u{1002B}"
    /// artboard
    case artboard = "\u{FA83}"
    /// article
    case article = "\u{F7DA}"
    /// aspect-ratio
    case aspectRatio = "\u{F7DB}"
    /// assembly
    case assembly = "\u{FE9E}"
    /// asset
    case asset = "\u{FE9D}"
    /// atom-2
    case atom2 = "\u{F71B}"
    /// automatic-gearbox
    case automaticGearbox = "\u{1002A}"
    /// award
    case award = "\u{F71C}"
    /// baby-carriage
    case babyCarriage = "\u{FE9C}"
    /// backspace
    case backspace = "\u{F7DC}"
    /// badge
    case badge = "\u{F667}"
    /// badge-3d
    case badge3d = "\u{FE9B}"
    /// badge-4k
    case badge4k = "\u{FE9A}"
    /// badge-8k
    case badge8k = "\u{FE99}"
    /// badge-ad
    case badgeAd = "\u{FE98}"
    /// badge-ar
    case badgeAr = "\u{FE97}"
    /// badge-cc
    case badgeCc = "\u{FE96}"
    /// badge-hd
    case badgeHd = "\u{FE95}"
    /// badge-sd
    case badgeSd = "\u{FE94}"
    /// badge-tm
    case badgeTm = "\u{FE93}"
    /// badge-vo
    case badgeVo = "\u{FE92}"
    /// badge-vr
    case badgeVr = "\u{FE91}"
    /// badge-wc
    case badgeWc = "\u{FE90}"
    /// badges
    case badges = "\u{F7DD}"
    /// balloon
    case balloon = "\u{FA84}"
    /// ballpen
    case ballpen = "\u{FA85}"
    /// bandage
    case bandage = "\u{F7DE}"
    /// barbell
    case barbell = "\u{FE8F}"
    /// barrier-block
    case barrierBlock = "\u{FE8E}"
    /// basket
    case basket = "\u{F7DF}"
    /// bath
    case bath = "\u{F71D}"
    /// battery
    case battery = "\u{F668}"
    /// battery-1
    case battery1 = "\u{F71E}"
    /// battery-2
    case battery2 = "\u{F71F}"
    /// battery-3
    case battery3 = "\u{F720}"
    /// battery-4
    case battery4 = "\u{F721}"
    /// battery-automotive
    case batteryAutomotive = "\u{10029}"
    /// battery-vertical
    case batteryVertical = "\u{10024}"
    /// battery-vertical-1
    case batteryVertical1 = "\u{10028}"
    /// battery-vertical-2
    case batteryVertical2 = "\u{10027}"
    /// battery-vertical-3
    case batteryVertical3 = "\u{10026}"
    /// battery-vertical-4
    case batteryVertical4 = "\u{10025}"
    /// bed
    case bed = "\u{F7E0}"
    /// bed-flat
    case bedFlat = "\u{FE8D}"
    /// beer
    case beer = "\u{F7E1}"
    /// bell
    case bell = "\u{F669}"
    /// bell-minus
    case bellMinus = "\u{F722}"
    /// bell-plus
    case bellPlus = "\u{F723}"
    /// bell-ringing
    case bellRinging = "\u{F725}"
    /// bell-ringing-2
    case bellRinging2 = "\u{F724}"
    /// bell-x
    case bellX = "\u{F726}"
    /// bell-z
    case bellZ = "\u{F727}"
    /// bike
    case bike = "\u{10023}"
    /// binary-tree
    case binaryTree = "\u{FF64}"
    /// binary-tree-2
    case binaryTree2 = "\u{FF65}"
    /// binoculars
    case binoculars = "\u{FF0B}"
    /// biohazard
    case biohazard = "\u{FE8C}"
    /// blade
    case blade = "\u{F7E2}"
    /// blender
    case blender = "\u{10022}"
    /// blob
    case blob = "\u{FEB1}"
    /// bolt
    case bolt = "\u{10021}"
    /// bomb
    case bomb = "\u{FA86}"
    /// bone
    case bone = "\u{FE8B}"
    /// bong
    case bong = "\u{10020}"
    /// book
    case book = "\u{FA87}"
    /// bookmark
    case bookmark = "\u{FA88}"
    /// bookmarks
    case bookmarks = "\u{FB1F}"
    /// boom
    case boom = "\u{FE8A}"
    /// bottle
    case bottle = "\u{FA89}"
    /// bounce-left
    case bounceLeft = "\u{FB20}"
    /// bounce-right
    case bounceRight = "\u{FB21}"
    /// bow
    case bow = "\u{FE89}"
    /// bowl
    case bowl = "\u{FB22}"
    /// bowl-chopsticks
    case bowlChopsticks = "\u{FE88}"
    /// bowl-spoon
    case bowlSpoon = "\u{FE87}"
    /// box-align-bottom
    case boxAlignBottom = "\u{FA8A}"
    /// box-align-bottom-left
    case boxAlignBottomLeft = "\u{FA8B}"
    /// box-align-bottom-right
    case boxAlignBottomRight = "\u{FA8C}"
    /// box-align-left
    case boxAlignLeft = "\u{FA8D}"
    /// box-align-right
    case boxAlignRight = "\u{FA8E}"
    /// box-align-top
    case boxAlignTop = "\u{FA8F}"
    /// box-align-top-left
    case boxAlignTopLeft = "\u{FA90}"
    /// box-align-top-right
    case boxAlignTopRight = "\u{FA91}"
    /// box-multiple
    case boxMultiple = "\u{1001F}"
    /// brand-angular
    case brandAngular = "\u{10095}"
    /// brand-apple
    case brandApple = "\u{FD74}"
    /// brand-bitbucket
    case brandBitbucket = "\u{100CB}"
    /// brand-discord
    case brandDiscord = "\u{F7E4}"
    /// brand-dribbble
    case brandDribbble = "\u{F7E5}"
    /// brand-facebook
    case brandFacebook = "\u{F7E6}"
    /// brand-github
    case brandGithub = "\u{F7E7}"
    /// brand-google
    case brandGoogle = "\u{FD1A}"
    /// brand-instagram
    case brandInstagram = "\u{10094}"
    /// brand-kick
    case brandKick = "\u{10093}"
    /// brand-linkedin
    case brandLinkedin = "\u{10092}"
    /// brand-messenger
    case brandMessenger = "\u{100A7}"
    /// brand-open-source
    case brandOpenSource = "\u{10091}"
    /// brand-opera
    case brandOpera = "\u{10090}"
    /// brand-patreon
    case brandPatreon = "\u{FCFF}"
    /// brand-paypal
    case brandPaypal = "\u{F7E9}"
    /// brand-pinterest
    case brandPinterest = "\u{1008F}"
    /// brand-sketch
    case brandSketch = "\u{1008E}"
    /// brand-snapchat
    case brandSnapchat = "\u{1008D}"
    /// brand-spotify
    case brandSpotify = "\u{FE86}"
    /// brand-steam
    case brandSteam = "\u{1008C}"
    /// brand-stripe
    case brandStripe = "\u{1008B}"
    /// brand-tabler
    case brandTabler = "\u{1008A}"
    /// brand-tiktok
    case brandTiktok = "\u{F7EA}"
    /// brand-tinder
    case brandTinder = "\u{10089}"
    /// brand-tumblr
    case brandTumblr = "\u{10088}"
    /// brand-twitter
    case brandTwitter = "\u{F7EB}"
    /// brand-vercel
    case brandVercel = "\u{10087}"
    /// brand-vimeo
    case brandVimeo = "\u{10086}"
    /// brand-weibo
    case brandWeibo = "\u{100A6}"
    /// brand-whatsapp
    case brandWhatsapp = "\u{10085}"
    /// brand-windows
    case brandWindows = "\u{10084}"
    /// brand-x
    case brandX = "\u{FC21}"
    /// brand-youtube
    case brandYoutube = "\u{FC22}"
    /// bread
    case bread = "\u{FE85}"
    /// briefcase
    case briefcase = "\u{FD00}"
    /// briefcase-2
    case briefcase2 = "\u{FE84}"
    /// brightness
    case brightness = "\u{FE82}"
    /// brightness-auto
    case brightnessAuto = "\u{FE83}"
    /// brightness-down
    case brightnessDown = "\u{FB23}"
    /// brightness-up
    case brightnessUp = "\u{FB24}"
    /// bubble
    case bubble = "\u{FEC3}"
    /// bubble-text
    case bubbleText = "\u{100A5}"
    /// bug
    case bug = "\u{FD01}"
    /// building-bridge-2
    case buildingBridge2 = "\u{10189}"
    /// building-broadcast-tower
    case buildingBroadcastTower = "\u{FE81}"
    /// bulb
    case bulb = "\u{F66A}"
    /// bus
    case bus = "\u{100FF}"
    /// butterfly
    case butterfly = "\u{10016}"
    /// cactus
    case cactus = "\u{FB25}"
    /// calculator
    case calculator = "\u{FB26}"
    /// calendar
    case calendar = "\u{FB27}"
    /// calendar-event
    case calendarEvent = "\u{100B9}"
    /// calendar-month
    case calendarMonth = "\u{100B8}"
    /// calendar-week
    case calendarWeek = "\u{100B7}"
    /// camera
    case camera = "\u{FA37}"
    /// campfire
    case campfire = "\u{FB28}"
    /// candle
    case candle = "\u{FC23}"
    /// cannabis
    case cannabis = "\u{10015}"
    /// capsule
    case capsule = "\u{FC24}"
    /// capsule-horizontal
    case capsuleHorizontal = "\u{FC25}"
    /// capture
    case capture = "\u{FB29}"
    /// car
    case car = "\u{1004C}"
    /// car-4wd
    case car4wd = "\u{1001E}"
    /// car-crane
    case carCrane = "\u{100FE}"
    /// car-fan
    case carFan = "\u{1001D}"
    /// car-suv
    case carSuv = "\u{1004D}"
    /// carambola
    case carambola = "\u{10014}"
    /// caravan
    case caravan = "\u{100FD}"
    /// cardboards
    case cardboards = "\u{1001C}"
    /// cards
    case cards = "\u{FC26}"
    /// caret-down
    case caretDown = "\u{FB2A}"
    /// caret-left
    case caretLeft = "\u{FB2B}"
    /// caret-left-right
    case caretLeftRight = "\u{FD02}"
    /// caret-right
    case caretRight = "\u{FB2C}"
    /// caret-up
    case caretUp = "\u{FB2D}"
    /// caret-up-down
    case caretUpDown = "\u{FD03}"
    /// carousel-horizontal
    case carouselHorizontal = "\u{FA92}"
    /// carousel-vertical
    case carouselVertical = "\u{FA93}"
    /// cash-banknote
    case cashBanknote = "\u{FE80}"
    /// category
    case category = "\u{FB2E}"
    /// charging-pile
    case chargingPile = "\u{1001B}"
    /// chart-area
    case chartArea = "\u{F66B}"
    /// chart-area-line
    case chartAreaLine = "\u{F66C}"
    /// chart-bubble
    case chartBubble = "\u{F66D}"
    /// chart-candle
    case chartCandle = "\u{F66E}"
    /// chart-donut
    case chartDonut = "\u{F66F}"
    /// chart-dots
    case chartDots = "\u{FD04}"
    /// chart-dots-2
    case chartDots2 = "\u{100DD}"
    /// chart-dots-3
    case chartDots3 = "\u{100DC}"
    /// chart-funnel
    case chartFunnel = "\u{100DB}"
    /// chart-grid-dots
    case chartGridDots = "\u{FD05}"
    /// chart-pie
    case chartPie = "\u{F670}"
    /// chart-pie-2
    case chartPie2 = "\u{100DA}"
    /// chart-pie-3
    case chartPie3 = "\u{100D9}"
    /// chart-pie-4
    case chartPie4 = "\u{100D8}"
    /// chef-hat
    case chefHat = "\u{100D7}"
    /// cherry
    case cherry = "\u{F728}"
    /// chess
    case chess = "\u{F72A}"
    /// chess-bishop
    case chessBishop = "\u{F729}"
    /// chess-king
    case chessKing = "\u{F72B}"
    /// chess-knight
    case chessKnight = "\u{F72C}"
    /// chess-queen
    case chessQueen = "\u{F72D}"
    /// chess-rook
    case chessRook = "\u{F72E}"
    /// christmas-tree
    case christmasTree = "\u{1001A}"
    /// circle
    case circle = "\u{F671}"
    /// circle-arrow-down
    case circleArrowDown = "\u{F6F4}"
    /// circle-arrow-down-left
    case circleArrowDownLeft = "\u{F6F5}"
    /// circle-arrow-down-right
    case circleArrowDownRight = "\u{F6F7}"
    /// circle-arrow-left
    case circleArrowLeft = "\u{F6FA}"
    /// circle-arrow-right
    case circleArrowRight = "\u{F6FC}"
    /// circle-arrow-up
    case circleArrowUp = "\u{F6FE}"
    /// circle-arrow-up-left
    case circleArrowUpLeft = "\u{F6FF}"
    /// circle-arrow-up-right
    case circleArrowUpRight = "\u{F701}"
    /// circle-caret-down
    case circleCaretDown = "\u{100D6}"
    /// circle-caret-left
    case circleCaretLeft = "\u{100D5}"
    /// circle-caret-right
    case circleCaretRight = "\u{100D4}"
    /// circle-caret-up
    case circleCaretUp = "\u{100D3}"
    /// circle-check
    case circleCheck = "\u{F704}"
    /// circle-chevron-down
    case circleChevronDown = "\u{100D2}"
    /// circle-chevron-left
    case circleChevronLeft = "\u{100D1}"
    /// circle-chevron-right
    case circleChevronRight = "\u{100D0}"
    /// circle-chevron-up
    case circleChevronUp = "\u{100CF}"
    /// circle-chevrons-down
    case circleChevronsDown = "\u{100EF}"
    /// circle-chevrons-left
    case circleChevronsLeft = "\u{100EE}"
    /// circle-chevrons-right
    case circleChevronsRight = "\u{100ED}"
    /// circle-chevrons-up
    case circleChevronsUp = "\u{100EC}"
    /// circle-dot
    case circleDot = "\u{F705}"
    /// circle-key
    case circleKey = "\u{F706}"
    /// circle-letter-a
    case circleLetterA = "\u{FE7F}"
    /// circle-letter-b
    case circleLetterB = "\u{FE7E}"
    /// circle-letter-c
    case circleLetterC = "\u{FE7D}"
    /// circle-letter-d
    case circleLetterD = "\u{FE7C}"
    /// circle-letter-e
    case circleLetterE = "\u{FE7B}"
    /// circle-letter-f
    case circleLetterF = "\u{FE7A}"
    /// circle-letter-g
    case circleLetterG = "\u{FE79}"
    /// circle-letter-h
    case circleLetterH = "\u{FE78}"
    /// circle-letter-i
    case circleLetterI = "\u{FE77}"
    /// circle-letter-j
    case circleLetterJ = "\u{FE76}"
    /// circle-letter-k
    case circleLetterK = "\u{FE75}"
    /// circle-letter-l
    case circleLetterL = "\u{FE74}"
    /// circle-letter-m
    case circleLetterM = "\u{FE73}"
    /// circle-letter-n
    case circleLetterN = "\u{FE72}"
    /// circle-letter-o
    case circleLetterO = "\u{FE71}"
    /// circle-letter-p
    case circleLetterP = "\u{FE70}"
    /// circle-letter-q
    case circleLetterQ = "\u{FE6F}"
    /// circle-letter-r
    case circleLetterR = "\u{FE6E}"
    /// circle-letter-s
    case circleLetterS = "\u{FE6D}"
    /// circle-letter-t
    case circleLetterT = "\u{FE6C}"
    /// circle-letter-u
    case circleLetterU = "\u{FE6B}"
    /// circle-letter-v
    case circleLetterV = "\u{FE6A}"
    /// circle-letter-w
    case circleLetterW = "\u{FE69}"
    /// circle-letter-x
    case circleLetterX = "\u{FE68}"
    /// circle-letter-y
    case circleLetterY = "\u{FE67}"
    /// circle-letter-z
    case circleLetterZ = "\u{FE66}"
    /// circle-number-0
    case circleNumber0 = "\u{F72F}"
    /// circle-number-1
    case circleNumber1 = "\u{F730}"
    /// circle-number-2
    case circleNumber2 = "\u{F731}"
    /// circle-number-3
    case circleNumber3 = "\u{F732}"
    /// circle-number-4
    case circleNumber4 = "\u{F733}"
    /// circle-number-5
    case circleNumber5 = "\u{F734}"
    /// circle-number-6
    case circleNumber6 = "\u{F735}"
    /// circle-number-7
    case circleNumber7 = "\u{F736}"
    /// circle-number-8
    case circleNumber8 = "\u{F737}"
    /// circle-number-9
    case circleNumber9 = "\u{F738}"
    /// circle-percentage
    case circlePercentage = "\u{FED5}"
    /// circle-plus
    case circlePlus = "\u{FEF9}"
    /// circle-rectangle
    case circleRectangle = "\u{FF63}"
    /// circle-x
    case circleX = "\u{F739}"
    /// circles
    case circles = "\u{F672}"
    /// clipboard
    case clipboard = "\u{100CC}"
    /// clipboard-check
    case clipboardCheck = "\u{100CE}"
    /// clipboard-data
    case clipboardData = "\u{100EB}"
    /// clipboard-list
    case clipboardList = "\u{100EA}"
    /// clipboard-plus
    case clipboardPlus = "\u{10176}"
    /// clipboard-smile
    case clipboardSmile = "\u{10175}"
    /// clipboard-text
    case clipboardText = "\u{100E9}"
    /// clipboard-typography
    case clipboardTypography = "\u{100E8}"
    /// clipboard-x
    case clipboardX = "\u{100CD}"
    /// clock
    case clock = "\u{F73A}"
    /// clock-hour-1
    case clockHour1 = "\u{FE65}"
    /// clock-hour-10
    case clockHour10 = "\u{FE64}"
    /// clock-hour-11
    case clockHour11 = "\u{FE63}"
    /// clock-hour-12
    case clockHour12 = "\u{FE62}"
    /// clock-hour-2
    case clockHour2 = "\u{FE61}"
    /// clock-hour-3
    case clockHour3 = "\u{FE60}"
    /// clock-hour-4
    case clockHour4 = "\u{FE5F}"
    /// clock-hour-5
    case clockHour5 = "\u{FE5E}"
    /// clock-hour-6
    case clockHour6 = "\u{FE5D}"
    /// clock-hour-7
    case clockHour7 = "\u{FE5C}"
    /// clock-hour-8
    case clockHour8 = "\u{FE5B}"
    /// clock-hour-9
    case clockHour9 = "\u{FE5A}"
    /// cloud
    case cloud = "\u{F673}"
    /// cloud-computing
    case cloudComputing = "\u{1010D}"
    /// cloud-data-connection
    case cloudDataConnection = "\u{1010C}"
    /// clover
    case clover = "\u{10013}"
    /// clubs
    case clubs = "\u{F674}"
    /// code-circle
    case codeCircle = "\u{FED3}"
    /// code-circle-2
    case codeCircle2 = "\u{FED4}"
    /// coin
    case coin = "\u{FD08}"
    /// coin-bitcoin
    case coinBitcoin = "\u{FD06}"
    /// coin-euro
    case coinEuro = "\u{FD07}"
    /// coin-monero
    case coinMonero = "\u{FD09}"
    /// coin-pound
    case coinPound = "\u{FD0A}"
    /// coin-rupee
    case coinRupee = "\u{FD0B}"
    /// coin-taka
    case coinTaka = "\u{FD0C}"
    /// coin-yen
    case coinYen = "\u{FD0E}"
    /// coin-yuan
    case coinYuan = "\u{FD0F}"
    /// columns-1
    case columns1 = "\u{10188}"
    /// columns-2
    case columns2 = "\u{10187}"
    /// columns-3
    case columns3 = "\u{10186}"
    /// compass
    case compass = "\u{FD10}"
    /// cone
    case cone = "\u{FE58}"
    /// cone-2
    case cone2 = "\u{FE59}"
    /// confetti
    case confetti = "\u{10185}"
    /// container
    case container = "\u{10184}"
    /// contrast
    case contrast = "\u{FE56}"
    /// contrast-2
    case contrast2 = "\u{FE57}"
    /// cookie
    case cookie = "\u{FE54}"
    /// cookie-man
    case cookieMan = "\u{FE55}"
    /// copy-check
    case copyCheck = "\u{FE53}"
    /// copy-minus
    case copyMinus = "\u{FE52}"
    /// copy-plus
    case copyPlus = "\u{FE51}"
    /// copy-x
    case copyX = "\u{FE50}"
    /// copyleft
    case copyleft = "\u{F73B}"
    /// copyright
    case copyright = "\u{F73C}"
    /// credit-card
    case creditCard = "\u{FD11}"
    /// crop-1-1
    case crop11 = "\u{FE4F}"
    /// crop-16-9
    case crop169 = "\u{FE4E}"
    /// crop-3-2
    case crop32 = "\u{FE4D}"
    /// crop-5-4
    case crop54 = "\u{FE4C}"
    /// crop-7-5
    case crop75 = "\u{FE4B}"
    /// crop-landscape
    case cropLandscape = "\u{FE4A}"
    /// crop-portrait
    case cropPortrait = "\u{FE49}"
    /// cross
    case cross = "\u{F675}"
    /// current-location
    case currentLocation = "\u{10125}"
    /// dashboard
    case dashboard = "\u{10019}"
    /// device-cctv
    case deviceCctv = "\u{1004B}"
    /// device-desktop
    case deviceDesktop = "\u{1004A}"
    /// device-gamepad
    case deviceGamepad = "\u{1019C}"
    /// device-gamepad-3
    case deviceGamepad3 = "\u{10049}"
    /// device-heart-monitor
    case deviceHeartMonitor = "\u{FA38}"
    /// device-imac
    case deviceImac = "\u{10048}"
    /// device-ipad
    case deviceIpad = "\u{10047}"
    /// device-mobile
    case deviceMobile = "\u{FA39}"
    /// device-remote
    case deviceRemote = "\u{10046}"
    /// device-speaker
    case deviceSpeaker = "\u{10045}"
    /// device-tablet
    case deviceTablet = "\u{FA3A}"
    /// device-tv
    case deviceTv = "\u{10043}"
    /// device-tv-old
    case deviceTvOld = "\u{10044}"
    /// device-unknown
    case deviceUnknown = "\u{10018}"
    /// device-usb
    case deviceUsb = "\u{10042}"
    /// device-vision-pro
    case deviceVisionPro = "\u{10041}"
    /// device-watch
    case deviceWatch = "\u{10040}"
    /// dialpad
    case dialpad = "\u{FA3B}"
    /// diamond
    case diamond = "\u{F73D}"
    /// diamonds
    case diamonds = "\u{F676}"
    /// dice
    case dice = "\u{F744}"
    /// dice-1
    case dice1 = "\u{F73E}"
    /// dice-2
    case dice2 = "\u{F73F}"
    /// dice-3
    case dice3 = "\u{F740}"
    /// dice-4
    case dice4 = "\u{F741}"
    /// dice-5
    case dice5 = "\u{F742}"
    /// dice-6
    case dice6 = "\u{F743}"
    /// direction-arrows
    case directionArrows = "\u{100CA}"
    /// direction-sign
    case directionSign = "\u{F745}"
    /// directions
    case directions = "\u{1003F}"
    /// disc
    case disc = "\u{1003E}"
    /// discount
    case discount = "\u{1003D}"
    /// drop-circle
    case dropCircle = "\u{10137}"
    /// droplet
    case droplet = "\u{EE80}"
    /// droplet-half
    case dropletHalf = "\u{F6C5}"
    /// droplet-half-2
    case dropletHalf2 = "\u{FB6C}"
    /// droplets
    case droplets = "\u{100C9}"
    /// dual-screen
    case dualScreen = "\u{10136}"
    /// dumpling
    case dumpling = "\u{10135}"
    /// ease-in-control-point
    case easeInControlPoint = "\u{10174}"
    /// ease-in-out-control-points
    case easeInOutControlPoints = "\u{10173}"
    /// ease-out-control-point
    case easeOutControlPoint = "\u{10172}"
    /// egg
    case egg = "\u{F678}"
    /// egg-cracked
    case eggCracked = "\u{10012}"
    /// egg-fried
    case eggFried = "\u{10134}"
    /// elevator
    case elevator = "\u{1003C}"
    /// engine
    case engine = "\u{100FC}"
    /// escalator
    case escalator = "\u{10131}"
    /// escalator-down
    case escalatorDown = "\u{10133}"
    /// escalator-up
    case escalatorUp = "\u{10132}"
    /// exchange
    case exchange = "\u{10130}"
    /// exclamation-circle
    case exclamationCircle = "\u{FF62}"
    /// explicit
    case explicit = "\u{1012F}"
    /// exposure
    case exposure = "\u{10124}"
    /// eye
    case eye = "\u{F679}"
    /// eye-table
    case eyeTable = "\u{10123}"
    /// eyeglass
    case eyeglass = "\u{100C8}"
    /// eyeglass-2
    case eyeglass2 = "\u{10122}"
    /// face-mask
    case faceMask = "\u{10121}"
    /// favicon
    case favicon = "\u{10071}"
    /// feather
    case feather = "\u{10011}"
    /// fence
    case fence = "\u{10120}"
    /// ferry
    case ferry = "\u{100FB}"
    /// fidget-spinner
    case fidgetSpinner = "\u{1011F}"
    /// file
    case file = "\u{F747}"
    /// file-analytics
    case fileAnalytics = "\u{10171}"
    /// file-check
    case fileCheck = "\u{1012E}"
    /// file-code
    case fileCode = "\u{10170}"
    /// file-code-2
    case fileCode2 = "\u{1012D}"
    /// file-cv
    case fileCv = "\u{1012C}"
    /// file-delta
    case fileDelta = "\u{1012B}"
    /// file-description
    case fileDescription = "\u{1011E}"
    /// file-diff
    case fileDiff = "\u{1016F}"
    /// file-digit
    case fileDigit = "\u{1011D}"
    /// file-dollar
    case fileDollar = "\u{1019B}"
    /// file-dots
    case fileDots = "\u{1016E}"
    /// file-download
    case fileDownload = "\u{1012A}"
    /// file-euro
    case fileEuro = "\u{1019A}"
    /// file-function
    case fileFunction = "\u{1016D}"
    /// file-horizontal
    case fileHorizontal = "\u{1011C}"
    /// file-info
    case fileInfo = "\u{1016C}"
    /// file-invoice
    case fileInvoice = "\u{1011B}"
    /// file-lambda
    case fileLambda = "\u{10129}"
    /// file-minus
    case fileMinus = "\u{1011A}"
    /// file-music
    case fileMusic = "\u{10199}"
    /// file-neutral
    case fileNeutral = "\u{10119}"
    /// file-pencil
    case filePencil = "\u{10198}"
    /// file-percent
    case filePercent = "\u{10128}"
    /// file-phone
    case filePhone = "\u{10127}"
    /// file-power
    case filePower = "\u{10118}"
    /// file-rss
    case fileRss = "\u{10126}"
    /// file-sad
    case fileSad = "\u{10117}"
    /// file-scissors
    case fileScissors = "\u{10197}"
    /// file-settings
    case fileSettings = "\u{10196}"
    /// file-signal
    case fileSignal = "\u{10195}"
    /// file-smile
    case fileSmile = "\u{10116}"
    /// file-star
    case fileStar = "\u{10115}"
    /// file-text
    case fileText = "\u{10114}"
    /// file-time
    case fileTime = "\u{10194}"
    /// file-typography
    case fileTypography = "\u{1016B}"
    /// file-unknown
    case fileUnknown = "\u{10193}"
    /// file-upload
    case fileUpload = "\u{10192}"
    /// file-vector
    case fileVector = "\u{10191}"
    /// file-x
    case fileX = "\u{F748}"
    /// files
    case files = "\u{10190}"
    /// filter
    case filter = "\u{FC27}"
    /// filters
    case filters = "\u{100C7}"
    /// fish-bone
    case fishBone = "\u{1010B}"
    /// flag
    case flag = "\u{F67A}"
    /// flag-2
    case flag2 = "\u{F707}"
    /// flag-3
    case flag3 = "\u{F708}"
    /// flame
    case flame = "\u{100C6}"
    /// flare
    case flare = "\u{100C5}"
    /// flask
    case flask = "\u{FD13}"
    /// flask-2
    case flask2 = "\u{FD12}"
    /// flower
    case flower = "\u{10010}"
    /// folder
    case folder = "\u{F749}"
    /// folders
    case folders = "\u{100C4}"
    /// forbid
    case forbid = "\u{FC29}"
    /// forbid-2
    case forbid2 = "\u{FC28}"
    /// fountain
    case fountain = "\u{FC2A}"
    /// function
    case function = "\u{FC2B}"
    /// garden-cart
    case gardenCart = "\u{100C3}"
    /// gas-station
    case gasStation = "\u{100FA}"
    /// gauge
    case gauge = "\u{FC2C}"
    /// ghost
    case ghost = "\u{F74B}"
    /// ghost-2
    case ghost2 = "\u{F74A}"
    /// ghost-3
    case ghost3 = "\u{100A4}"
    /// gift
    case gift = "\u{FD14}"
    /// gift-card
    case giftCard = "\u{FC2D}"
    /// glass
    case glass = "\u{1000F}"
    /// glass-full
    case glassFull = "\u{FC2E}"
    /// globe
    case globe = "\u{FC2F}"
    /// golf
    case golf = "\u{100A3}"
    /// gps
    case gps = "\u{FE48}"
    /// graph
    case graph = "\u{FD15}"
    /// grid-pattern
    case gridPattern = "\u{100C2}"
    /// guitar-pick
    case guitarPick = "\u{F67B}"
    /// hanger-2
    case hanger2 = "\u{FF61}"
    /// headphones
    case headphones = "\u{FA3C}"
    /// heart
    case heart = "\u{F67C}"
    /// heart-broken
    case heartBroken = "\u{1016A}"
    /// helicopter
    case helicopter = "\u{100F9}"
    /// helicopter-landing
    case helicopterLanding = "\u{100C1}"
    /// help-circle
    case helpCircle = "\u{FA3D}"
    /// help-hexagon
    case helpHexagon = "\u{FA3E}"
    /// help-octagon
    case helpOctagon = "\u{FA3F}"
    /// help-square
    case helpSquare = "\u{FA40}"
    /// help-square-rounded
    case helpSquareRounded = "\u{FA41}"
    /// help-triangle
    case helpTriangle = "\u{FA42}"
    /// hexagon
    case hexagon = "\u{F67D}"
    /// hexagon-letter-a
    case hexagonLetterA = "\u{FE47}"
    /// hexagon-letter-b
    case hexagonLetterB = "\u{FE46}"
    /// hexagon-letter-c
    case hexagonLetterC = "\u{FE45}"
    /// hexagon-letter-d
    case hexagonLetterD = "\u{FE44}"
    /// hexagon-letter-e
    case hexagonLetterE = "\u{FE43}"
    /// hexagon-letter-f
    case hexagonLetterF = "\u{FE42}"
    /// hexagon-letter-g
    case hexagonLetterG = "\u{FE41}"
    /// hexagon-letter-h
    case hexagonLetterH = "\u{FE40}"
    /// hexagon-letter-i
    case hexagonLetterI = "\u{FE3F}"
    /// hexagon-letter-j
    case hexagonLetterJ = "\u{FE3E}"
    /// hexagon-letter-k
    case hexagonLetterK = "\u{FE3D}"
    /// hexagon-letter-l
    case hexagonLetterL = "\u{FE3C}"
    /// hexagon-letter-m
    case hexagonLetterM = "\u{FE3B}"
    /// hexagon-letter-n
    case hexagonLetterN = "\u{FE3A}"
    /// hexagon-letter-o
    case hexagonLetterO = "\u{FE39}"
    /// hexagon-letter-p
    case hexagonLetterP = "\u{FE38}"
    /// hexagon-letter-q
    case hexagonLetterQ = "\u{FE37}"
    /// hexagon-letter-r
    case hexagonLetterR = "\u{FE36}"
    /// hexagon-letter-s
    case hexagonLetterS = "\u{FE35}"
    /// hexagon-letter-t
    case hexagonLetterT = "\u{FE34}"
    /// hexagon-letter-u
    case hexagonLetterU = "\u{FE33}"
    /// hexagon-letter-v
    case hexagonLetterV = "\u{FE32}"
    /// hexagon-letter-w
    case hexagonLetterW = "\u{FE31}"
    /// hexagon-letter-x
    case hexagonLetterX = "\u{FE30}"
    /// hexagon-letter-y
    case hexagonLetterY = "\u{FE2F}"
    /// hexagon-letter-z
    case hexagonLetterZ = "\u{FE2E}"
    /// hexagon-minus
    case hexagonMinus = "\u{FE2D}"
    /// hexagon-number-0
    case hexagonNumber0 = "\u{F74C}"
    /// hexagon-number-1
    case hexagonNumber1 = "\u{F74D}"
    /// hexagon-number-2
    case hexagonNumber2 = "\u{F74E}"
    /// hexagon-number-3
    case hexagonNumber3 = "\u{F74F}"
    /// hexagon-number-4
    case hexagonNumber4 = "\u{F750}"
    /// hexagon-number-5
    case hexagonNumber5 = "\u{F751}"
    /// hexagon-number-6
    case hexagonNumber6 = "\u{F752}"
    /// hexagon-number-7
    case hexagonNumber7 = "\u{F753}"
    /// hexagon-number-8
    case hexagonNumber8 = "\u{F754}"
    /// hexagon-number-9
    case hexagonNumber9 = "\u{F755}"
    /// hexagon-plus
    case hexagonPlus = "\u{FE2C}"
    /// home
    case home = "\u{FE2B}"
    /// hospital-circle
    case hospitalCircle = "\u{FED2}"
    /// hourglass
    case hourglass = "\u{F756}"
    /// icons
    case icons = "\u{10070}"
    /// info-circle
    case infoCircle = "\u{F6D8}"
    /// info-hexagon
    case infoHexagon = "\u{FA43}"
    /// info-octagon
    case infoOctagon = "\u{FA44}"
    /// info-square
    case infoSquare = "\u{FA45}"
    /// info-square-rounded
    case infoSquareRounded = "\u{F6D9}"
    /// info-triangle
    case infoTriangle = "\u{FA46}"
    /// inner-shadow-bottom
    case innerShadowBottom = "\u{F757}"
    /// inner-shadow-bottom-left
    case innerShadowBottomLeft = "\u{F758}"
    /// inner-shadow-bottom-right
    case innerShadowBottomRight = "\u{F759}"
    /// inner-shadow-left
    case innerShadowLeft = "\u{F75A}"
    /// inner-shadow-right
    case innerShadowRight = "\u{F75B}"
    /// inner-shadow-top
    case innerShadowTop = "\u{F75C}"
    /// inner-shadow-top-left
    case innerShadowTopLeft = "\u{F75D}"
    /// inner-shadow-top-right
    case innerShadowTopRight = "\u{F75E}"
    /// ironing
    case ironing = "\u{FE2A}"
    /// ironing-1
    case ironing1 = "\u{1006F}"
    /// ironing-2
    case ironing2 = "\u{1006E}"
    /// ironing-3
    case ironing3 = "\u{1006D}"
    /// ironing-steam
    case ironingSteam = "\u{1006C}"
    /// jetpack
    case jetpack = "\u{FE29}"
    /// jewish-star
    case jewishStar = "\u{F67E}"
    /// key
    case key = "\u{FE28}"
    /// keyboard
    case keyboard = "\u{100A2}"
    /// keyframe
    case keyframe = "\u{FC33}"
    /// keyframe-align-center
    case keyframeAlignCenter = "\u{FC30}"
    /// keyframe-align-horizontal
    case keyframeAlignHorizontal = "\u{FC31}"
    /// keyframe-align-vertical
    case keyframeAlignVertical = "\u{FC32}"
    /// keyframes
    case keyframes = "\u{FC34}"
    /// label
    case label = "\u{FF41}"
    /// label-important
    case labelImportant = "\u{FF60}"
    /// lasso-polygon
    case lassoPolygon = "\u{FF5F}"
    /// laurel-wreath
    case laurelWreath = "\u{100C0}"
    /// laurel-wreath-1
    case laurelWreath1 = "\u{10169}"
    /// laurel-wreath-2
    case laurelWreath2 = "\u{10168}"
    /// laurel-wreath-3
    case laurelWreath3 = "\u{10167}"
    /// layout
    case layout = "\u{FE17}"
    /// layout-2
    case layout2 = "\u{FE27}"
    /// layout-align-bottom
    case layoutAlignBottom = "\u{FE26}"
    /// layout-align-center
    case layoutAlignCenter = "\u{FE25}"
    /// layout-align-left
    case layoutAlignLeft = "\u{FE24}"
    /// layout-align-middle
    case layoutAlignMiddle = "\u{FE23}"
    /// layout-align-right
    case layoutAlignRight = "\u{FE22}"
    /// layout-align-top
    case layoutAlignTop = "\u{FE21}"
    /// layout-board
    case layoutBoard = "\u{10182}"
    /// layout-board-split
    case layoutBoardSplit = "\u{10183}"
    /// layout-bottombar
    case layoutBottombar = "\u{FC37}"
    /// layout-bottombar-collapse
    case layoutBottombarCollapse = "\u{FC35}"
    /// layout-bottombar-expand
    case layoutBottombarExpand = "\u{FC36}"
    /// layout-cards
    case layoutCards = "\u{FE20}"
    /// layout-dashboard
    case layoutDashboard = "\u{FE1F}"
    /// layout-distribute-horizontal
    case layoutDistributeHorizontal = "\u{FE1E}"
    /// layout-distribute-vertical
    case layoutDistributeVertical = "\u{FE1D}"
    /// layout-grid
    case layoutGrid = "\u{FE1C}"
    /// layout-kanban
    case layoutKanban = "\u{FE1B}"
    /// layout-list
    case layoutList = "\u{FE1A}"
    /// layout-navbar
    case layoutNavbar = "\u{FC3A}"
    /// layout-navbar-collapse
    case layoutNavbarCollapse = "\u{FC38}"
    /// layout-navbar-expand
    case layoutNavbarExpand = "\u{FC39}"
    /// layout-sidebar
    case layoutSidebar = "\u{FE18}"
    /// layout-sidebar-left-collapse
    case layoutSidebarLeftCollapse = "\u{FC3B}"
    /// layout-sidebar-left-expand
    case layoutSidebarLeftExpand = "\u{FC3C}"
    /// layout-sidebar-right
    case layoutSidebarRight = "\u{FE19}"
    /// layout-sidebar-right-collapse
    case layoutSidebarRightCollapse = "\u{FC3D}"
    /// layout-sidebar-right-expand
    case layoutSidebarRightExpand = "\u{FC3E}"
    /// lego
    case lego = "\u{FE16}"
    /// lemon-2
    case lemon2 = "\u{100BF}"
    /// library
    case library = "\u{10180}"
    /// library-plus
    case libraryPlus = "\u{10181}"
    /// lifebuoy
    case lifebuoy = "\u{100BE}"
    /// live-photo
    case livePhoto = "\u{FED1}"
    /// live-view
    case liveView = "\u{100A1}"
    /// location
    case location = "\u{F67F}"
    /// lock
    case lock = "\u{FE15}"
    /// lock-square-rounded
    case lockSquareRounded = "\u{F6DA}"
    /// lungs
    case lungs = "\u{FE14}"
    /// macro
    case macro = "\u{FE13}"
    /// magnet
    case magnet = "\u{FE12}"
    /// mail
    case mail = "\u{FA47}"
    /// mail-opened
    case mailOpened = "\u{FA48}"
    /// man
    case man = "\u{FE11}"
    /// manual-gearbox
    case manualGearbox = "\u{FE10}"
    /// map-pin
    case mapPin = "\u{F680}"
    /// medical-cross
    case medicalCross = "\u{F681}"
    /// meeple
    case meeple = "\u{100A0}"
    /// melon
    case melon = "\u{1000E}"
    /// message
    case message = "\u{FECD}"
    /// message-2
    case message2 = "\u{1009F}"
    /// message-chatbot
    case messageChatbot = "\u{FED0}"
    /// message-circle
    case messageCircle = "\u{FECF}"
    /// message-report
    case messageReport = "\u{FECE}"
    /// meteor
    case meteor = "\u{1000D}"
    /// michelin-star
    case michelinStar = "\u{1000C}"
    /// mickey
    case mickey = "\u{F683}"
    /// microphone
    case microphone = "\u{FE0F}"
    /// microscope
    case microscope = "\u{10166}"
    /// microwave
    case microwave = "\u{FE0E}"
    /// military-rank
    case militaryRank = "\u{FF5E}"
    /// milk
    case milk = "\u{1000B}"
    /// mood-angry
    case moodAngry = "\u{FF0A}"
    /// mood-confuzed
    case moodConfuzed = "\u{F7F2}"
    /// mood-crazy-happy
    case moodCrazyHappy = "\u{FF09}"
    /// mood-empty
    case moodEmpty = "\u{F7F3}"
    /// mood-happy
    case moodHappy = "\u{F7F4}"
    /// mood-kid
    case moodKid = "\u{F7F5}"
    /// mood-neutral
    case moodNeutral = "\u{F7F6}"
    /// mood-sad
    case moodSad = "\u{F7F7}"
    /// mood-smile
    case moodSmile = "\u{F7F8}"
    /// mood-wrrr
    case moodWrrr = "\u{FF08}"
    /// moon
    case moon = "\u{F684}"
    /// motorbike
    case motorbike = "\u{100F8}"
    /// mountain
    case mountain = "\u{1000A}"
    /// mouse
    case mouse = "\u{FB2F}"
    /// mug
    case mug = "\u{10009}"
    /// mushroom
    case mushroom = "\u{F7F9}"
    /// navigation
    case navigation = "\u{F685}"
    /// nurse
    case nurse = "\u{1009E}"
    /// octagon
    case octagon = "\u{F686}"
    /// octagon-minus
    case octagonMinus = "\u{1017F}"
    /// octagon-plus
    case octagonPlus = "\u{1017E}"
    /// oval
    case oval = "\u{F687}"
    /// oval-vertical
    case ovalVertical = "\u{F688}"
    /// paint
    case paint = "\u{F75F}"
    /// palette
    case palette = "\u{1009D}"
    /// panorama-horizontal
    case panoramaHorizontal = "\u{FECC}"
    /// panorama-vertical
    case panoramaVertical = "\u{FECB}"
    /// parking-circle
    case parkingCircle = "\u{FECA}"
    /// paw
    case paw = "\u{F689}"
    /// pennant
    case pennant = "\u{F68B}"
    /// pennant-2
    case pennant2 = "\u{F68A}"
    /// pentagon
    case pentagon = "\u{F68C}"
    /// phone
    case phone = "\u{FA49}"
    /// photo
    case photo = "\u{FA4A}"
    /// picture-in-picture
    case pictureInPicture = "\u{FEC1}"
    /// picture-in-picture-top
    case pictureInPictureTop = "\u{FEC2}"
    /// pig
    case pig = "\u{1010A}"
    /// pill
    case pill = "\u{FF07}"
    /// pin
    case pin = "\u{F68D}"
    /// pinned
    case pinned = "\u{F68E}"
    /// pizza
    case pizza = "\u{10008}"
    /// play-card-1
    case playCard1 = "\u{10083}"
    /// play-card-10
    case playCard10 = "\u{10082}"
    /// play-card-2
    case playCard2 = "\u{10081}"
    /// play-card-3
    case playCard3 = "\u{10080}"
    /// play-card-4
    case playCard4 = "\u{1007F}"
    /// play-card-5
    case playCard5 = "\u{1007E}"
    /// play-card-6
    case playCard6 = "\u{1007D}"
    /// play-card-7
    case playCard7 = "\u{1007C}"
    /// play-card-8
    case playCard8 = "\u{1007B}"
    /// play-card-9
    case playCard9 = "\u{1007A}"
    /// play-card-a
    case playCardA = "\u{10079}"
    /// play-card-j
    case playCardJ = "\u{10078}"
    /// play-card-k
    case playCardK = "\u{10077}"
    /// play-card-q
    case playCardQ = "\u{10076}"
    /// play-card-star
    case playCardStar = "\u{10075}"
    /// player-eject
    case playerEject = "\u{F68F}"
    /// player-pause
    case playerPause = "\u{F690}"
    /// player-play
    case playerPlay = "\u{F691}"
    /// player-record
    case playerRecord = "\u{F692}"
    /// player-skip-back
    case playerSkipBack = "\u{F693}"
    /// player-skip-forward
    case playerSkipForward = "\u{F694}"
    /// player-stop
    case playerStop = "\u{F695}"
    /// player-track-next
    case playerTrackNext = "\u{F696}"
    /// player-track-prev
    case playerTrackPrev = "\u{F697}"
    /// point
    case point = "\u{F698}"
    /// pointer
    case pointer = "\u{FB30}"
    /// polaroid
    case polaroid = "\u{FA4B}"
    /// poo
    case poo = "\u{FEC9}"
    /// presentation
    case presentation = "\u{FF5C}"
    /// presentation-analytics
    case presentationAnalytics = "\u{FF5D}"
    /// puzzle
    case puzzle = "\u{F699}"
    /// quote
    case quote = "\u{1009C}"
    /// radar
    case radar = "\u{FE0D}"
    /// radioactive
    case radioactive = "\u{F760}"
    /// receipt
    case receipt = "\u{FF06}"
    /// receipt-dollar
    case receiptDollar = "\u{1017D}"
    /// receipt-euro
    case receiptEuro = "\u{1017C}"
    /// receipt-pound
    case receiptPound = "\u{1017B}"
    /// receipt-rupee
    case receiptRupee = "\u{1017A}"
    /// receipt-yen
    case receiptYen = "\u{10179}"
    /// receipt-yuan
    case receiptYuan = "\u{10178}"
    /// rectangle
    case rectangle = "\u{F69A}"
    /// rectangle-vertical
    case rectangleVertical = "\u{F69B}"
    /// registered
    case registered = "\u{1018F}"
    /// relation-many-to-many
    case relationManyToMany = "\u{FE0C}"
    /// relation-one-to-many
    case relationOneToMany = "\u{FE0B}"
    /// relation-one-to-one
    case relationOneToOne = "\u{FE0A}"
    /// replace
    case replace = "\u{F69C}"
    /// rollercoaster
    case rollercoaster = "\u{100F7}"
    /// rosette
    case rosette = "\u{F69D}"
    /// rosette-discount
    case rosetteDiscount = "\u{FF05}"
    /// rosette-discount-check
    case rosetteDiscountCheck = "\u{F746}"
    /// salad
    case salad = "\u{10007}"
    /// scuba-diving-tank
    case scubaDivingTank = "\u{FF04}"
    /// section
    case section = "\u{FE09}"
    /// seedling
    case seedling = "\u{10006}"
    /// settings
    case settings = "\u{F69E}"
    /// shield
    case shield = "\u{F69F}"
    /// shield-check
    case shieldCheck = "\u{F761}"
    /// shield-checkered
    case shieldCheckered = "\u{F762}"
    /// shield-half
    case shieldHalf = "\u{F357}"
    /// shield-lock
    case shieldLock = "\u{F763}"
    /// shirt
    case shirt = "\u{F6A0}"
    /// shopping-cart
    case shoppingCart = "\u{FC3F}"
    /// sign-left
    case signLeft = "\u{F6A1}"
    /// sign-right
    case signRight = "\u{F6A2}"
    /// sitemap
    case sitemap = "\u{1006B}"
    /// sort-ascending-2
    case sortAscending2 = "\u{FF5B}"
    /// sort-ascending-shapes
    case sortAscendingShapes = "\u{FF5A}"
    /// sort-descending-2
    case sortDescending2 = "\u{FF59}"
    /// sort-descending-shapes
    case sortDescendingShapes = "\u{FF58}"
    /// soup
    case soup = "\u{FE08}"
    /// spade
    case spade = "\u{F6A3}"
    /// speedboat
    case speedboat = "\u{100F6}"
    /// spider
    case spider = "\u{10109}"
    /// square
    case square = "\u{FC40}"
    /// square-arrow-down
    case squareArrowDown = "\u{FB31}"
    /// square-arrow-left
    case squareArrowLeft = "\u{FB32}"
    /// square-arrow-right
    case squareArrowRight = "\u{FB33}"
    /// square-arrow-up
    case squareArrowUp = "\u{FB34}"
    /// square-asterisk
    case squareAsterisk = "\u{FB35}"
    /// square-check
    case squareCheck = "\u{F76D}"
    /// square-chevron-down
    case squareChevronDown = "\u{FB36}"
    /// square-chevron-left
    case squareChevronLeft = "\u{FB37}"
    /// square-chevron-right
    case squareChevronRight = "\u{FB38}"
    /// square-chevron-up
    case squareChevronUp = "\u{FB39}"
    /// square-chevrons-down
    case squareChevronsDown = "\u{FB3A}"
    /// square-chevrons-left
    case squareChevronsLeft = "\u{FB3B}"
    /// square-chevrons-right
    case squareChevronsRight = "\u{FB3C}"
    /// square-chevrons-up
    case squareChevronsUp = "\u{FB3D}"
    /// square-dot
    case squareDot = "\u{FB3E}"
    /// square-f0
    case squareF0 = "\u{F76E}"
    /// square-f1
    case squareF1 = "\u{F76F}"
    /// square-f2
    case squareF2 = "\u{F770}"
    /// square-f3
    case squareF3 = "\u{F771}"
    /// square-f4
    case squareF4 = "\u{F772}"
    /// square-f5
    case squareF5 = "\u{F773}"
    /// square-f6
    case squareF6 = "\u{F774}"
    /// square-f7
    case squareF7 = "\u{F775}"
    /// square-f8
    case squareF8 = "\u{F776}"
    /// square-f9
    case squareF9 = "\u{F777}"
    /// square-letter-a
    case squareLetterA = "\u{FE07}"
    /// square-letter-b
    case squareLetterB = "\u{FE06}"
    /// square-letter-c
    case squareLetterC = "\u{FE05}"
    /// square-letter-d
    case squareLetterD = "\u{FE04}"
    /// square-letter-e
    case squareLetterE = "\u{FE03}"
    /// square-letter-f
    case squareLetterF = "\u{FE02}"
    /// square-letter-g
    case squareLetterG = "\u{FE01}"
    /// square-letter-h
    case squareLetterH = "\u{FE00}"
    /// square-letter-i
    case squareLetterI = "\u{FDFF}"
    /// square-letter-j
    case squareLetterJ = "\u{FDFE}"
    /// square-letter-k
    case squareLetterK = "\u{FDFD}"
    /// square-letter-l
    case squareLetterL = "\u{FDFC}"
    /// square-letter-m
    case squareLetterM = "\u{FDFB}"
    /// square-letter-n
    case squareLetterN = "\u{FDFA}"
    /// square-letter-o
    case squareLetterO = "\u{FDF9}"
    /// square-letter-p
    case squareLetterP = "\u{FDF8}"
    /// square-letter-q
    case squareLetterQ = "\u{FDF7}"
    /// square-letter-r
    case squareLetterR = "\u{FDF6}"
    /// square-letter-s
    case squareLetterS = "\u{FDF5}"
    /// square-letter-t
    case squareLetterT = "\u{FDF4}"
    /// square-letter-u
    case squareLetterU = "\u{FDF3}"
    /// square-letter-v
    case squareLetterV = "\u{FDF2}"
    /// square-letter-w
    case squareLetterW = "\u{FDF1}"
    /// square-letter-x
    case squareLetterX = "\u{FDF0}"
    /// square-letter-y
    /// square-letter-z
    /// square-minus
    case squareMinus = "\u{FB3F}"
    /// square-number-0
    case squareNumber0 = "\u{F764}"
    /// square-number-1
    case squareNumber1 = "\u{F765}"
    /// square-number-2
    case squareNumber2 = "\u{F7FA}"
    /// square-number-3
    case squareNumber3 = "\u{F766}"
    /// square-number-4
    case squareNumber4 = "\u{F767}"
    /// square-number-5
    case squareNumber5 = "\u{F768}"
    /// square-number-6
    case squareNumber6 = "\u{F769}"
    /// square-number-7
    case squareNumber7 = "\u{F76A}"
    /// square-number-8
    case squareNumber8 = "\u{F76B}"
    /// square-number-9
    case squareNumber9 = "\u{F76C}"
    /// square-rotated
    case squareRotated = "\u{F6A4}"
    /// square-rounded
    case squareRounded = "\u{F6A5}"
    /// square-rounded-arrow-down
    case squareRoundedArrowDown = "\u{F6DB}"
    /// square-rounded-arrow-left
    case squareRoundedArrowLeft = "\u{F6DC}"
    /// square-rounded-arrow-right
    case squareRoundedArrowRight = "\u{F6DD}"
    /// square-rounded-arrow-up
    case squareRoundedArrowUp = "\u{F6DE}"
    /// square-rounded-check
    case squareRoundedCheck = "\u{F6DF}"
    /// square-rounded-chevron-down
    case squareRoundedChevronDown = "\u{F6E0}"
    /// square-rounded-chevron-left
    case squareRoundedChevronLeft = "\u{F6E1}"
    /// square-rounded-chevron-right
    case squareRoundedChevronRight = "\u{F6E2}"
    /// square-rounded-chevron-up
    case squareRoundedChevronUp = "\u{F6E3}"
    /// square-rounded-chevrons-down
    case squareRoundedChevronsDown = "\u{F6E4}"
    /// square-rounded-chevrons-left
    case squareRoundedChevronsLeft = "\u{F6E5}"
    /// square-rounded-chevrons-right
    case squareRoundedChevronsRight = "\u{F6E6}"
    /// square-rounded-chevrons-up
    case squareRoundedChevronsUp = "\u{F6E7}"
    /// square-rounded-letter-a
    /// square-rounded-letter-b
    /// square-rounded-letter-c
    /// square-rounded-letter-d
    /// square-rounded-letter-e
    /// square-rounded-letter-f
    /// square-rounded-letter-g
    /// square-rounded-letter-h
    /// square-rounded-letter-i
    /// square-rounded-letter-j
    /// square-rounded-letter-k
    /// square-rounded-letter-l
    /// square-rounded-letter-m
    /// square-rounded-letter-n
    /// square-rounded-letter-o
    /// square-rounded-letter-p
    /// square-rounded-letter-q
    /// square-rounded-letter-r
    /// square-rounded-letter-s
    /// square-rounded-letter-t
    /// square-rounded-letter-u
    /// square-rounded-letter-v
    /// square-rounded-letter-w
    /// square-rounded-letter-x
    /// square-rounded-letter-y
    /// square-rounded-letter-z
    /// square-rounded-minus
    case squareRoundedMinus = "\u{FB40}"
    /// square-rounded-number-0
    case squareRoundedNumber0 = "\u{F778}"
    /// square-rounded-number-1
    case squareRoundedNumber1 = "\u{F779}"
    /// square-rounded-number-2
    case squareRoundedNumber2 = "\u{F77A}"
    /// square-rounded-number-3
    case squareRoundedNumber3 = "\u{F77B}"
    /// square-rounded-number-4
    case squareRoundedNumber4 = "\u{F77C}"
    /// square-rounded-number-5
    case squareRoundedNumber5 = "\u{F77D}"
    /// square-rounded-number-6
    case squareRoundedNumber6 = "\u{F77E}"
    /// square-rounded-number-7
    case squareRoundedNumber7 = "\u{F77F}"
    /// square-rounded-number-8
    case squareRoundedNumber8 = "\u{F780}"
    /// square-rounded-number-9
    case squareRoundedNumber9 = "\u{F781}"
    /// square-rounded-plus
    case squareRoundedPlus = "\u{F6E8}"
    /// square-rounded-x
    case squareRoundedX = "\u{F6E9}"
    /// square-x
    case squareX = "\u{FB41}"
    /// squares
    case squares = "\u{FE9F}"
    /// stack
    /// stack-2
    /// stack-3
    /// star
    case star = "\u{F6A6}"
    /// star-half
    case starHalf = "\u{F6A7}"
    /// stars
    case stars = "\u{F6A8}"
    /// steering-wheel
    case steeringWheel = "\u{FF03}"
    /// sun
    case sun = "\u{F6A9}"
    /// sun-high
    case sunHigh = "\u{10108}"
    /// sun-low
    case sunLow = "\u{10107}"
    /// sunglasses
    case sunglasses = "\u{FEC8}"
    /// sunrise
    case sunrise = "\u{10106}"
    /// sunset
    case sunset = "\u{10104}"
    /// sunset-2
    case sunset2 = "\u{10105}"
    /// swipe-down
    case swipeDown = "\u{FF57}"
    /// swipe-left
    case swipeLeft = "\u{FF56}"
    /// swipe-right
    case swipeRight = "\u{FF55}"
    /// swipe-up
    case swipeUp = "\u{FF54}"
    /// table
    case table = "\u{F782}"
    /// tag
    case tag = "\u{FF02}"
    /// tags
    case tags = "\u{FF01}"
    /// temperature-minus
    case temperatureMinus = "\u{10103}"
    /// temperature-plus
    case temperaturePlus = "\u{10102}"
    /// template
    case template = "\u{10177}"
    /// test-pipe-2
    case testPipe2 = "\u{FF53}"
    /// thumb-down
    case thumbDown = "\u{F6AA}"
    /// thumb-up
    case thumbUp = "\u{F6AB}"
    /// tilt-shift
    case tiltShift = "\u{FEC7}"
    /// timeline-event
    case timelineEvent = "\u{FD18}"
    /// toggle-left
    case toggleLeft = "\u{FEC0}"
    /// toggle-right
    case toggleRight = "\u{FEBF}"
    /// train
    case train = "\u{100F5}"
    /// transform
    case transform = "\u{F6AC}"
    /// transition-bottom
    /// transition-left
    case transitionLeft = "\u{FDCF}"
    /// transition-right
    case transitionRight = "\u{FDCE}"
    /// transition-top
    case transitionTop = "\u{FDCD}"
    /// trash
    case trash = "\u{F783}"
    /// trash-x
    case trashX = "\u{F784}"
    /// triangle
    case triangle = "\u{F6AD}"
    /// triangle-inverted
    case triangleInverted = "\u{F6AE}"
    /// triangle-square-circle
    case triangleSquareCircle = "\u{FB42}"
    /// trolley
    case trolley = "\u{100F4}"
    /// trophy
    case trophy = "\u{F6AF}"
    /// truck
    case truck = "\u{100F3}"
    /// ufo
    case ufo = "\u{10165}"
    /// umbrella
    case umbrella = "\u{F6B0}"
    /// user
    case user = "\u{FD19}"
    /// versions
    case versions = "\u{F6B1}"
    /// video
    case video = "\u{1009B}"
    /// video-minus
    case videoMinus = "\u{1018E}"
    /// video-plus
    case videoPlus = "\u{1018D}"
    /// windmill
    case windmill = "\u{F6B2}"
    /// windsock
    case windsock = "\u{1009A}"
    /// woman
    case woman = "\u{FDCC}"
    /// writing
    case writing = "\u{1018B}"
    /// writing-sign
    case writingSign = "\u{1018C}"
    /// xbox-a
    case xboxA = "\u{FDCB}"
    /// xbox-b
    case xboxB = "\u{FDCA}"
    /// xbox-x
    case xboxX = "\u{FDC9}"
    /// xbox-y
    case xboxY = "\u{FDC8}"
    /// yin-yang
    case yinYang = "\u{F785}"
    /// zeppelin
    case zeppelin = "\u{FDC7}"
    /// zoom
    case zoom = "\u{F787}"
    /// zoom-cancel
    case zoomCancel = "\u{FDC6}"
    /// zoom-check
    case zoomCheck = "\u{F786}"
    /// zoom-code
    case zoomCode = "\u{FDC5}"
    /// zoom-exclamation
    case zoomExclamation = "\u{FDC4}"
    /// zoom-in
    case zoomIn = "\u{F789}"
    /// zoom-in-area
    case zoomInArea = "\u{F788}"
    /// zoom-money
    case zoomMoney = "\u{FDC3}"
    /// zoom-out
    case zoomOut = "\u{F78A}"
    /// zoom-out-area
    case zoomOutArea = "\u{FDC2}"
    /// zoom-pan
    case zoomPan = "\u{FDC1}"
    /// zoom-question
    case zoomQuestion = "\u{FDC0}"
    /// zoom-scan
    case zoomScan = "\u{FDBF}"
}

extension TablerIconFilled {
    /// Alias for `rosetteDiscountCheck`
    public static var discountCheck: TablerIconFilled { .rosetteDiscountCheck }
    /// Alias for `messageCircle`
    public static var messageCircle2: TablerIconFilled { .messageCircle }
    /// Alias for `seedling`
    public static var seeding: TablerIconFilled { .seedling }
}
