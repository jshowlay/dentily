/**
 * Branded 2-page Dentily quick start guide, rendered entirely server-side via
 * @react-pdf/renderer (see app/api/download/route.ts). No client-side PDF code.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { DENTILY_PDF_FONTS, DENTILY_PDF_THEME as T } from "@/lib/pdf/dentily-pdf-theme";
import { PACK_CONTACT_SATISFACTION_GUARANTEE } from "@/lib/site-config";

const styles = StyleSheet.create({
  page: {
    backgroundColor: T.bg,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 11,
    color: T.ink,
    fontFamily: DENTILY_PDF_FONTS.sans,
  },
  wordmark: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontSize: 18,
    color: T.ink,
    marginBottom: 28,
  },
  heroTitle: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontSize: 28,
    lineHeight: 1.25,
    color: T.ink,
    marginBottom: 8,
  },
  heroAccent: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontStyle: "italic",
    color: T.green,
  },
  heroSub: {
    fontSize: 12,
    color: T.muted,
    lineHeight: 1.5,
    marginBottom: 28,
  },
  sectionEyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: T.hint,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontSize: 16,
    color: T.ink,
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: "31%",
    minWidth: 150,
    backgroundColor: T.surface,
    borderWidth: 0.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statValue: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontSize: 22,
    lineHeight: 1,
    color: T.ink,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 10,
    color: T.hint,
    lineHeight: 1.35,
  },
  breakdownCard: {
    backgroundColor: T.surface,
    borderWidth: 0.5,
    borderColor: T.border,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: T.border,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  breakdownRowFirst: {
    borderTopWidth: 0,
  },
  breakdownType: {
    width: "34%",
    fontSize: 10.5,
    fontWeight: 500,
    color: T.ink,
  },
  breakdownCount: {
    width: "26%",
    fontSize: 10.5,
    fontWeight: 600,
    color: T.green,
  },
  breakdownDesc: {
    width: "40%",
    fontSize: 10,
    color: T.muted,
    lineHeight: 1.45,
  },
  footerNote: {
    fontSize: 10,
    color: T.muted,
    lineHeight: 1.55,
  },
  step: {
    flexDirection: "row",
    marginBottom: 20,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.ink,
    color: T.bg,
    fontFamily: DENTILY_PDF_FONTS.sans,
    fontWeight: 600,
    fontSize: 11,
    textAlign: "center",
    paddingTop: 7,
    marginRight: 12,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: DENTILY_PDF_FONTS.sans,
    fontSize: 12,
    fontWeight: 600,
    color: T.ink,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 10.5,
    color: T.muted,
    lineHeight: 1.55,
  },
  stepEm: {
    fontFamily: DENTILY_PDF_FONTS.serif,
    fontStyle: "italic",
    color: T.hint,
  },
  mono: {
    fontFamily: DENTILY_PDF_FONTS.sans,
    fontWeight: 500,
    color: T.ink,
  },
  pageFooter: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: T.hint,
    borderTopWidth: 0.5,
    borderTopColor: T.border,
    paddingTop: 8,
  },
  sectionSpacer: {
    marginTop: 8,
  },
});

type BreakdownRow = { type: string; count: string; description: string };

function PageFooter({ page }: { page: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={{ maxWidth: "72%", lineHeight: 1.4 }}>{PACK_CONTACT_SATISFACTION_GUARANTEE}</Text>
      <Text>Page {page} of 2</Text>
    </View>
  );
}

export interface QuickStartGuideProps {
  market: string;
  totalPractices: number;
  contactableLeads: number;
  topPriorityLeads: number;
  emailCount: number;
  formCount: number;
  phoneCount: number;
}

export function QuickStartGuide({
  market,
  totalPractices,
  topPriorityLeads,
  emailCount,
  formCount,
  phoneCount,
}: QuickStartGuideProps) {
  const stats = [
    { value: String(totalPractices), label: "Total practices" },
    { value: String(emailCount), label: "Email leads" },
    { value: String(formCount), label: "Contact form" },
    { value: String(phoneCount), label: "Phone only" },
    { value: String(topPriorityLeads), label: "Top priority" },
  ];

  const breakdown: BreakdownRow[] = [
    { type: "Email leads", count: `${emailCount} practices`, description: "Ready to email directly" },
    { type: "Contact form", count: `${formCount} practices`, description: "Submit via their web form" },
    { type: "Phone only", count: `${phoneCount} practices`, description: "Call or voicemail" },
  ];

  return (
    <Document
      title={`Dentily — ${market} Dental Leads Quick Start Guide`}
      author="Dentily"
      subject={`Quick start guide for your ${market} Dental Leads Pack`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.wordmark}>Dentily</Text>

        <Text style={styles.heroTitle}>
          <Text style={styles.heroAccent}>{market}</Text>
          <Text> dental leads pack</Text>
        </Text>
        <Text style={styles.heroSub}>
          Your quick start guide — stats match the cleaned CSV you downloaded (after dedupe and email
          filtering).
        </Text>

        <Text style={styles.sectionEyebrow}>Pack summary</Text>
        <View style={styles.statGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your lead breakdown</Text>
        <View style={styles.breakdownCard}>
          {breakdown.map((row, i) => (
            <View
              key={row.type}
              style={[styles.breakdownRow, ...(i === 0 ? [styles.breakdownRowFirst] : [])]}
            >
              <Text style={styles.breakdownType}>{row.type}</Text>
              <Text style={styles.breakdownCount}>{row.count}</Text>
              <Text style={styles.breakdownDesc}>{row.description}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          All {totalPractices} practices in this pack are {market}-area dental listings sourced from Google Maps
          and enriched with contact data using the same export pipeline as your CSV.
        </Text>

        <PageFooter page={1} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.wordmark}>Dentily</Text>
        <Text style={[styles.heroTitle, { fontSize: 22, marginBottom: 24 }]}>
          How to use this <Text style={styles.heroAccent}>pack</Text>
        </Text>

        <View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Open in Google Sheets or Excel</Text>
              <Text style={styles.stepDesc}>
                Upload the CSV via File &gt; Import. Freeze row 1 as your header.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Sort by Priority, then Score</Text>
              <Text style={styles.stepDesc}>
                Filter Priority = High first, then sort Score descending. These are your warmest leads.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Start with Email leads</Text>
              <Text style={styles.stepDesc}>
                Filter &quot;Best Contact Method&quot; = Email. These have addresses found on the
                practice&apos;s website and the highest reply rate.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>4</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Fill in your 3 placeholders</Text>
              <Text style={styles.stepDesc}>
                Every outreach draft contains <Text style={styles.mono}>{"{{your_name}}"}</Text>,{" "}
                <Text style={styles.mono}>{"{{your_company}}"}</Text>, and{" "}
                <Text style={styles.mono}>{"{{your_credibility_line}}"}</Text>. Find &amp; replace all
                three before sending anything. Example credibility line:{" "}
                <Text style={styles.stepEm}>
                  &quot;I help dental practices grow their new patient pipeline — I&apos;ve worked with
                  8 practices in the last 18 months.&quot;
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>5</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Use the Outreach Draft column</Text>
              <Text style={styles.stepDesc}>
                Each lead has a personalized cold email pre-written. Customize the subject line and
                send. For phone-only leads, use the Voicemail Script column.
              </Text>
            </View>
          </View>
        </View>

        <PageFooter page={2} />
      </Page>
    </Document>
  );
}

export default QuickStartGuide;
