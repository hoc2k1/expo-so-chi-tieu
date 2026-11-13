import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface MultiSelectOption {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subtitle?: string;
}

interface MultiSelectGridModalProps {
  visible: boolean;
  title: string;
  options: MultiSelectOption[];
  selectedIds: string[]; // empty array means 'all'
  columns?: 2 | 3;
  allLabel?: string;
  onClose: () => void;
  onApply: (selectedIds: string[]) => void;
}

const MultiSelectGridModalContent: React.FC<Omit<MultiSelectGridModalProps, 'visible'>> = ({
  title,
  options,
  selectedIds,
  columns = 2,
  allLabel = 'Tất cả',
  onClose,
  onApply,
}) => {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  const isAllSelected = selected.length === 0;

  const handleToggle = (id: string) => {
    if (isAllSelected) {
      // If currently 'all', selecting one means only selecting that one
      setSelected([id]);
      return;
    }

    if (selected.includes(id)) {
      const next = selected.filter((item) => item !== id);
      setSelected(next);
    } else {
      const next = [...selected, id];
      // If all items are selected, reset to [] (which represents 'all')
      if (next.length === options.length) {
        setSelected([]);
      } else {
        setSelected(next);
      }
    }
  };

  const handleSelectAll = () => {
    setSelected([]); // [] means all
  };

  const handleDeselectAll = () => {
    // If user clicks deselect all, keep an explicit selection of 0 items
    // But since empty means all, we can indicate empty selection or keep empty
    setSelected([]);
  };

  const handleConfirm = () => {
    onApply(selected);
    onClose();
  };

  const colWidth = columns === 3 ? '31.5%' : '48.5%';

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheetContainer} edges={['bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {isAllSelected
                  ? `${allLabel} (${options.length})`
                  : `Đã chọn ${selected.length}/${options.length}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          {options.length > 6 && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                placeholderTextColor="#64748B"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Quick Action Bar */}
          <View style={styles.quickBar}>
            <TouchableOpacity
              style={[styles.quickBtn, isAllSelected && styles.quickBtnActive]}
              onPress={handleSelectAll}
            >
              <Ionicons
                name={isAllSelected ? 'checkmark-circle' : 'radio-button-off'}
                size={14}
                color={isAllSelected ? '#38BDF8' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.quickBtnText,
                  isAllSelected && styles.quickBtnTextActive,
                ]}
              >
                {allLabel}
              </Text>
            </TouchableOpacity>

            {!isAllSelected && (
              <TouchableOpacity style={styles.quickBtn} onPress={handleDeselectAll}>
                <Ionicons name="refresh" size={14} color="#EF4444" />
                <Text style={[styles.quickBtnText, { color: '#EF4444' }]}>
                  Chọn lại tất cả
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Grid of Options */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredOptions.map((opt) => {
              const isChecked = isAllSelected || selected.includes(opt.id);
              const isExplicit = !isAllSelected && selected.includes(opt.id);

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.gridItem,
                    { width: colWidth },
                    isChecked && styles.gridItemChecked,
                    isExplicit && styles.gridItemExplicit,
                  ]}
                  onPress={() => handleToggle(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTopRow}>
                    {opt.color ? (
                      <View
                        style={[
                          styles.colorBadge,
                          { backgroundColor: opt.color || '#3B82F6' },
                        ]}
                      >
                        {opt.icon ? (
                          <Ionicons
                            name={opt.icon as any}
                            size={14}
                            color="#FFFFFF"
                          />
                        ) : null}
                      </View>
                    ) : opt.icon ? (
                      <Ionicons
                        name={opt.icon as any}
                        size={16}
                        color={isChecked ? '#38BDF8' : '#94A3B8'}
                      />
                    ) : (
                      <View style={styles.dotIndicator} />
                    )}

                    <Ionicons
                      name={
                        isExplicit
                          ? 'checkbox'
                          : isAllSelected
                          ? 'checkmark-circle-outline'
                          : 'square-outline'
                      }
                      size={18}
                      color={
                        isExplicit
                          ? '#38BDF8'
                          : isAllSelected
                          ? '#0284C7'
                          : '#475569'
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.itemName,
                      isChecked && styles.itemNameChecked,
                    ]}
                    numberOfLines={2}
                  >
                    {opt.name}
                  </Text>

                  {opt.subtitle ? (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleSelectAll}>
              <Text style={styles.resetBtnText}>Mặc định ({allLabel})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-done" size={18} color="#0F172A" />
              <Text style={styles.applyBtnText}>
                {isAllSelected
                  ? `Áp dụng (${allLabel})`
                  : `Áp dụng (${selected.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
  );
};

export const MultiSelectGridModal: React.FC<MultiSelectGridModalProps> = (props) => {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {props.visible ? <MultiSelectGridModalContent {...props} /> : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '82%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  quickBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C720',
  },
  quickBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  quickBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  scrollArea: {
    paddingHorizontal: 16,
    maxHeight: 380,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  gridItem: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-between',
    minHeight: 74,
  },
  gridItemChecked: {
    borderColor: '#0284C7',
    backgroundColor: '#0f243a',
  },
  gridItemExplicit: {
    borderColor: '#38BDF8',
    backgroundColor: '#03344e',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  itemName: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  itemNameChecked: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resetBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    gap: 6,
  },
  applyBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
});
