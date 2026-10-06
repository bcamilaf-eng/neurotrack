import { StyleSheet, View } from 'react-native';
import { LEGAL_DRAFT_NOTICE, LEGAL_VERSION, type LegalSection } from '../../../i18n/legal';
import { AppText, Banner, Screen } from '../../components';
import { spacing } from '../../theme';

/** Documento legal por secciones, con su versión. */
export function LegalDocument({ sections }: { sections: LegalSection[] }) {
  return (
    <Screen edges={['left', 'right']}>
      <Banner tone="info" message={LEGAL_DRAFT_NOTICE} />
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="heading">{section.title}</AppText>
          {section.paragraphs.map((p) => (
            <AppText key={p}>{p}</AppText>
          ))}
        </View>
      ))}
      <AppText variant="caption" muted>
        Versión {LEGAL_VERSION}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
