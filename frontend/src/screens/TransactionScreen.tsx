import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { notificationService } from '../services/notificationService';
import { transactionService, Category } from '../services/transactionService';
import { tagsService } from '../services/tagsService';
import { getTransactionTypeColor, getTransactionTypeLabel, formatDate } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import * as Contacts from 'expo-contacts';

const PAYMENT_METHODS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: 'cash' as const },
  { key: 'credito', label: 'Crédito', icon: 'credit-card' as const },
  { key: 'debito', label: 'Débito', icon: 'credit-card-outline' as const },
];

const AVAILABLE_ICONS = [
  'trending-up', 'briefcase-outline', 'paw', 'run', 'school-outline',
  'cart-outline', 'heart-outline', 'star-outline', 'camera-outline', 'airplane'
];

const AVAILABLE_COLORS = [
  '#FF5252', '#448AFF', '#4CAF50', '#FFD740', '#E040FB',
  '#FF9100', '#00BCD4', '#607D8B', '#1A1A1A'
];

export const TransactionScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { type } = route.params;
  const themeColor = getTransactionTypeColor(type);
  const { colors } = useTheme();

  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [isPaid, setIsPaid] = useState(true);
  const [isFixed, setIsFixed] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState<string>(new Date().getDate().toString());

  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false); // Adicionado aqui
  
  // Custom Time Picker State for Notifications
  const [notificationTime, setNotificationTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0); // Padrão: 09:00
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Custom Toast State
  const [showToast, setShowToast] = useState(false);

  // States for New Category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [newCategoryColor, setNewCategoryColor] = useState(themeColor);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);

  // Payment Method & Receipt Photo States (Sprint 1)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // US-11 Credit Card & Installments
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [installments, setInstallments] = useState('1');
  const [cardModalVisible, setCardModalVisible] = useState(false);

  // US-12 Accounts
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // US-GPS States
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [useGps, setUseGps] = useState(true);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // SPRINT 3 (US-27, US-28)
  const [contactName, setContactName] = useState('');
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#607D8B');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactList, setContactList] = useState<any[]>([]);

  useEffect(() => {
    loadCategories();
    loadCards();
    loadAccounts();
    loadTags();
    if (useGps) {
      captureLocation();
    }
  }, []);

  const loadTags = async () => {
    try {
      const data = await tagsService.getTags();
      setAllTags(data);
    } catch (e) {
      console.log('Erro ao carregar tags:', e);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await tagsService.createTag(newTagName.trim(), newTagColor);
      setAllTags([...allTags, newTag]);
      setSelectedTagIds([...selectedTagIds, newTag.id]);
      setNewTagName('');
      setTagModalVisible(false);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar a tag.');
    }
  };

  const captureLocation = async () => {
    try {
      setIsCapturingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUseGps(false);
        setIsCapturingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);

      // Reverso Geocoding para pegar o endereço legível
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (addr) {
        const fullAddr = `${addr.street || ''}, ${addr.name || ''} - ${addr.subregion || addr.city || ''}`;
        setLocationAddress(fullAddr);
      }
    } catch (error) {
      console.log('Erro ao capturar localização:', error);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await transactionService.getAccounts();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0]);
    } catch (error) {
      console.log('Erro ao carregar contas:', error);
    }
  };

  const loadCards = async () => {
    try {
      const cards = await transactionService.getCreditCards();
      setCreditCards(cards);
      if (cards.length > 0) setSelectedCard(cards[0]);
    } catch (error) {
      console.log('Erro ao carregar cartões:', error);
    }
  };

  const loadCategories = async () => {
    try {
      setFetchingCategories(true);
      const data = await transactionService.getCategories(type as any);
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setFetchingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      let newCat: Category;
      if (editingCategoryId) {
        newCat = await transactionService.updateCategory(editingCategoryId, {
          name: newCategoryName,
          icon: newCategoryIcon,
          color: newCategoryColor
        });
        setCategories(categories.map(c => (c.id === editingCategoryId ? newCat : c)));
      } else {
        newCat = await transactionService.createCategory(
          newCategoryName,
          type as any,
          newCategoryIcon,
          newCategoryColor
        );
        setCategories([...categories, newCat]);
      }
      setSelectedCategory(newCat);
      resetNewCategoryForm();
      setNewCategoryModalVisible(false);
      setCategoryModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a categoria.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    Alert.alert(
      'Excluir?',
      'Se excluir, transações vinculadas ficarão sem categoria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteCategory(id);
              setCategories(categories.filter(c => c.id !== id));
              if (selectedCategory?.id === id) setSelectedCategory(null);
            } catch (error) {
              Alert.alert('Erro', 'Categorias do sistema não podem ser excluídas.');
            }
          }
        }
      ]
    );
  };

  const handleIsPaidChange = (val: boolean) => {
    setIsPaid(val);
    // Se marcou como pago e a data é futura, volta pra hoje
    if (val && date > new Date()) {
      setDate(new Date());
    }
  };

  const resetNewCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryIcon('tag');
    setNewCategoryColor(themeColor);
    setEditingCategoryId(null);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon || 'tag');
    setNewCategoryColor(category.color || themeColor);
    setNewCategoryModalVisible(true);
  };

  const formatToCurrency = (val: string) => {
    // Remove tudo o que não for número
    let cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) return '';

    // Converte para centavos
    let intVal = parseInt(cleanVal);
    let formatted = (intVal / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatted;
  };

  const handleValueChange = (text: string) => {
    const formatted = formatToCurrency(text);
    setValue(formatted);
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações.');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Permita o acesso à galeria nas configurações.');
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

      if (!result.canceled && result.assets?.[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Comprovante', 'Como deseja anexar?', [
      { text: 'Câmera', onPress: () => pickImage(true) },
      { text: 'Galeria', onPress: () => pickImage(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, informe uma descrição para a transação');
      return;
    }

    const numericValue = value.replace(/\./g, '').replace(',', '.');
    if (!numericValue || parseFloat(numericValue) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    const cleanValue = parseFloat(numericValue);

    // Requisito 9: Bloquear transação caso o limite do cartão seja excedido
    if (type === 'expense' && paymentMethod === 'credito' && selectedCard) {
      if (cleanValue > selectedCard.available_limit) {
        Alert.alert(
          'Limite Excedido',
          `Você não pode registrar esta despesa. O valor da compra (R$ ${cleanValue.toFixed(2)}) excede o limite disponível do cartão ${selectedCard.name} (R$ ${selectedCard.available_limit.toFixed(2)}).`
        );
        return;
      }
    }

    // Validar transação fixa
    if (isFixed) {
      const dayNum = parseInt(dayOfMonth);
      if (!dayOfMonth || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        Alert.alert('Erro', 'Dia inválido. Deve estar entre 1 e 31');
        return;
      }
    }

    setLoading(true);
    try {
      // Upload da foto do comprovante se existir
      let receiptPhotoUrl: string | null = null;
      if (receiptUri) {
        setUploadingPhoto(true);
        try {
          const uploadResult = await transactionService.uploadReceipt(receiptUri);
          receiptPhotoUrl = uploadResult.url;
        } catch (uploadErr) {
          console.error('Erro no upload:', uploadErr);
          Alert.alert('Aviso', 'Não foi possível enviar o comprovante, mas a transação será salva.');
        } finally {
          setUploadingPhoto(false);
        }
      }

      const payload: any = {
        category_id: selectedCategory?.id,
        credit_card_id: paymentMethod === 'credito' ? selectedCard?.id : null,
        account_id: selectedAccount?.id,
        type: type as any,
        value: cleanValue,
        description: description || getTransactionTypeLabel(type),
        date: date.toISOString(),
        is_paid: isPaid,
        is_fixed: isFixed,
        day_of_month: isFixed ? parseInt(dayOfMonth) : null,
        payment_method: paymentMethod as any,
        installments_total: paymentMethod === 'credito' ? parseInt(installments) || 1 : 1,
        receipt_photo: receiptPhotoUrl,
        latitude: useGps && location ? location.coords.latitude : null,
        longitude: useGps && location ? location.coords.longitude : null,
        location_address: useGps ? locationAddress : null,
        contact_name: contactName ? contactName.trim() : null,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : null,
      };

      const newT = await transactionService.createTransaction(payload);

      // AGENDAR LEMBRETES SE FOR CONTA A PAGAR PENDENTE (RF11)
      if (type === 'expense' && !isPaid) {
          try {
              const hasPermission = await notificationService.requestPermissions();
              if (hasPermission) {
                  const ids = await notificationService.scheduleBillReminder(
                      description || 'Conta a pagar',
                      value,
                      date,
                      newT?.id || 0,
                      notificationTime
                  );
                  if (ids.length > 0) {
                      console.log(`[RF11] ${ids.length} lembrete(s) agendado(s) para "${description}":`, ids);
                  }
              }
          } catch (notifErr) {
              console.log('[RF11] Erro ao agendar notificação:', notifErr);
          }
      }

      // MOSTRAR NOTIFICAÇÃO PREMIUM
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        navigation.goBack();
      }, 1500);

    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Ocorreu um problema ao salvar.';
      Alert.alert('Erro', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: Category | null): any => {
    if (!category) return 'tag';
    if (category.icon) return category.icon;

    const n = category.name.toLowerCase();
    if (n.includes('moradia')) return 'home-city';
    if (n.includes('alimentação')) return 'food';
    if (n.includes('transporte')) return 'car-back';
    if (n.includes('saúde')) return 'heart-pulse';
    if (n.includes('lazer')) return 'controller-classic';
    if (n.includes('salário')) return 'bank-transfer-in';
    if (n.includes('renda extra')) return 'gift';
    if (n.includes('empréstimo')) return 'bank';
    return 'tag';
  };

  const getCategoryColor = (category: Category | null) => {
    if (!category) return themeColor;
    return category.color || themeColor;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* TOAST CUSTOMIZADO (NOTIFICAÇÃO) */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <View style={[styles.toastIconCircle, { backgroundColor: themeColor }]}>
              <Icon name="check" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.toastTitle}>Sucesso!</Text>
              <Text style={styles.toastSub}>{getTransactionTypeLabel(type)} salva com sucesso.</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={30} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Nova {getTransactionTypeLabel(type)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.valueSection}>
            <Text style={styles.valueLabel}>VALOR</Text>
            <View style={styles.valueInputRow}>
              <Text style={[styles.currency, { color: themeColor }]}>R$</Text>
              <TextInput
                style={[styles.bigInput, { color: themeColor }]}
                placeholder="0,00"
                value={value}
                onChangeText={handleValueChange}
                keyboardType="decimal-pad"
                placeholderTextColor="#DDD"
              />
            </View>
          </View>

          {!isFixed && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Data do Pagamento</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  max={isPaid ? new Date().toISOString().split('T')[0] : undefined}
                  onChange={(e) => setDate(new Date(e.target.value))}
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                    fontFamily: 'sans-serif'
                  }}
                />
              ) : (
                <View>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
                    <Icon name="calendar" size={20} color={themeColor} style={{ marginRight: 10 }} />
                    <Text style={styles.pickerButtonText}>{formatDate(date.toISOString())}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      maximumDate={isPaid ? new Date() : undefined}
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setDate(d);
                      }}
                    />
                  )}
                </View>
              )}
            </View>
          )}

          {!isFixed && type === 'expense' && !isPaid && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Horário do Lembrete</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${String(notificationTime.getHours()).padStart(2, '0')}:${String(notificationTime.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':');
                    const newTime = new Date(notificationTime);
                    newTime.setHours(parseInt(h), parseInt(m), 0, 0);
                    setNotificationTime(newTime);
                  }}
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '16px',
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                    fontFamily: 'sans-serif'
                  }}
                />
              ) : (
                <View>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.pickerButton}>
                    <Icon name="clock-outline" size={20} color={themeColor} style={{ marginRight: 10 }} />
                    <Text style={styles.pickerButtonText}>
                      {`${String(notificationTime.getHours()).padStart(2, '0')}:${String(notificationTime.getMinutes()).padStart(2, '0')}`}
                    </Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={notificationTime}
                      mode="time"
                      display="default"
                      onChange={(e, d) => {
                        setShowTimePicker(false);
                        if (d) setNotificationTime(d);
                      }}
                    />
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Categoria</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View style={[styles.miniCircle, { backgroundColor: getCategoryColor(selectedCategory) + '20' }]}>
                <Icon name={getCategoryIcon(selectedCategory)} size={20} color={getCategoryColor(selectedCategory)} />
              </View>
              <Text style={[styles.pickerButtonText, { color: colors.inputText }]}>
                {selectedCategory ? selectedCategory.name : 'Selecione'}
              </Text>
              <Icon name="chevron-down" size={24} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIÇÃO *</Text>
            <TextInput
              style={[styles.cleanInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder={type === 'expense' ? "Insira o nome desta despesa" : "Insira o nome desta receita"}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* SPRINT 3: TAGS & CONTATO (US-27, US-28) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Tags</Text>
            <View style={styles.tagsContainer}>
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      { backgroundColor: tag.color || '#607D8B' },
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                      } else {
                        setSelectedTagIds([...selectedTagIds, tag.id]);
                      }
                    }}
                  >
                    <Text style={styles.tagChipText}>{tag.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.tagChip, { backgroundColor: colors.border }]}
                onPress={() => setTagModalVisible(true)}
              >
                <Text style={[styles.tagChipText, { color: colors.text }]}>+ Nova</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Contato Associado</Text>
              <TouchableOpacity 
                style={{ padding: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={async () => {
                  try {
                    const { status } = await Contacts.requestPermissionsAsync();
                    if (status === 'granted') {
                      const { data } = await Contacts.getContactsAsync({
                        fields: [Contacts.Fields.Name],
                        pageSize: 100,
                      });
                      
                      const validContacts = data.filter(c => c.name && c.name.trim() !== '' && !c.name.includes('null'));
                      
                      if (validContacts.length > 0) {
                        setContactList(validContacts);
                        setShowContactPicker(true);
                      } else {
                        Alert.alert('Agenda Vazia', 'Nenhum contato com nome válido encontrado.');
                      }
                    } else {
                      Alert.alert('Permissão negada', 'Não podemos acessar os contatos.');
                    }
                  } catch(e) {
                    console.log(e);
                    Alert.alert('Erro', 'Não foi possível carregar contatos.');
                  }
                }}
              >
                <Icon name="contacts" size={16} color={themeColor} />
                <Text style={{ color: themeColor, fontSize: 12 }}>Abrir Agenda</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.cleanInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="Insira o nome do contato"
              value={contactName}
              onChangeText={setContactName}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* FORMA DE PAGAMENTO */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Forma de Pagamento</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity
                  key={pm.key}
                  style={[
                    styles.paymentOption,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    paymentMethod === pm.key && { borderColor: themeColor, backgroundColor: themeColor + '15' },
                  ]}
                  onPress={() => setPaymentMethod(paymentMethod === pm.key ? null : pm.key)}
                >
                  <Icon
                    name={pm.icon as any}
                    size={22}
                    color={paymentMethod === pm.key ? themeColor : '#999'}
                  />
                  <Text
                    style={[
                      styles.paymentLabel,
                      { color: colors.textMuted },
                      paymentMethod === pm.key && { color: themeColor, fontWeight: 'bold' },
                    ]}
                  >
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* OPÇÕES DE CRÉDITO (US-11) */}
            {paymentMethod === 'credito' && (
                <View style={{ marginTop: 10, gap: 15 }}>
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted, fontSize: 10 }]}>Cartão</Text>
                        <TouchableOpacity 
                            style={[styles.pickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                            onPress={() => setCardModalVisible(true)}
                        >
                            <Icon name="credit-card" size={20} color={themeColor} style={{ marginRight: 10 }} />
                            <Text style={[styles.pickerButtonText, { color: colors.inputText }]}>
                                {selectedCard ? selectedCard.name : 'Selecionar Cartão'}
                            </Text>
                            <Icon name="chevron-down" size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted, fontSize: 10 }]}>Número de Parcelas</Text>
                        <TextInput
                            style={[styles.cleanInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                            keyboardType="numeric"
                            placeholder="Insira a quantidade de parcelas"
                            value={installments}
                            onChangeText={setInstallments}
                            placeholderTextColor={colors.placeholder}
                        />
                    </View>
                </View>
            )}
          </View>

          {/* SELEÇÃO DE CONTA (US-12) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Conta / Carteira</Text>
            <TouchableOpacity 
                style={[styles.pickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setAccountModalVisible(true)}
            >
                <Icon name="bank" size={20} color={themeColor} style={{ marginRight: 10 }} />
                <Text style={[styles.pickerButtonText, { color: colors.inputText }]}>
                    {selectedAccount ? selectedAccount.name : 'Selecionar Conta'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* FOTO DO COMPROVANTE */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Comprovante</Text>
            {receiptUri ? (
              <View style={styles.receiptPreviewContainer}>
                <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                <View style={styles.receiptActions}>
                  <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: themeColor }]} onPress={showImageOptions}>
                    <Icon name="camera-retake" size={18} color="#FFF" />
                    <Text style={styles.receiptBtnText}>Trocar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: '#F44336' }]} onPress={() => setReceiptUri(null)}>
                    <Icon name="delete" size={18} color="#FFF" />
                    <Text style={styles.receiptBtnText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.attachBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={showImageOptions}>
                <Icon name="camera-plus" size={28} color={themeColor} />
                <Text style={[styles.attachBtnText, { color: themeColor }]}>Anexar foto do comprovante</Text>
                <Text style={[styles.attachBtnSub, { color: colors.textMuted }]}>Câmera ou galeria • JPG, PNG até 5MB</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statusSection}>
            <View style={[styles.verticalSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Já foi {type === 'income' ? 'recebido' : 'pago'}?</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>{isPaid ? 'Sim, concluído' : 'Ainda pendente'}</Text>
              </View>
              <Switch value={isPaid} onValueChange={handleIsPaidChange} thumbColor={isPaid ? themeColor : '#CCC'} />
            </View>

            <View style={[styles.verticalSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>É uma despesa fixa?</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>Recorrente todo mês</Text>
              </View>
              <Switch value={isFixed} onValueChange={setIsFixed} thumbColor={isFixed ? themeColor : '#CCC'} />
            </View>

            {isFixed && (
              <View style={[styles.fieldGroup, { marginTop: 10 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Dia do Vencimento/Recebimento</Text>
                <TextInput
                  style={[styles.cleanInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  keyboardType="numeric"
                  placeholder="Insira o dia do mês (1 a 31)"
                  value={dayOfMonth}
                  onChangeText={(val) => {
                    const num = parseInt(val);
                    if (!val || (num >= 1 && num <= 31)) {
                      setDayOfMonth(val);
                    }
                  }}
                  placeholderTextColor={colors.placeholder}
                />
                <Text style={[styles.helperText, { color: colors.textMuted }]}>Este lançamento ocorrerá automaticamente todo mês neste dia.</Text>
              </View>
            )}

            {/* GPS UI */}
            <View style={[styles.verticalSwitch, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
              <View style={styles.switchInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="map-marker-radius" size={18} color={useGps ? themeColor : colors.textMuted} />
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Salvar Localização</Text>
                </View>
                <Text style={[styles.switchSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {isCapturingLocation ? 'Capturando local...' : (locationAddress || 'Localização não disponível')}
                </Text>
              </View>
              <Switch value={useGps} onValueChange={(val) => {
                setUseGps(val);
                if (val && !location) captureLocation();
              }} thumbColor={useGps ? themeColor : '#CCC'} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.mainSaveBtn, { backgroundColor: themeColor }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                {uploadingPhoto && <Text style={{ color: '#fff', fontSize: 13 }}>Enviando foto...</Text>}
              </View>
            ) : (
              <Text style={styles.mainSaveBtnText}>Salvar {getTransactionTypeLabel(type)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE SELEÇÃO DE CATEGORIA */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Categorias</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => { setSelectedCategory(item); setCategoryModalVisible(false); }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: (item.color || themeColor) + '15' }]}>
                    <Icon name={getCategoryIcon(item)} size={28} color={item.color || themeColor} />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addCategoryItem}
                  onPress={() => setNewCategoryModalVisible(true)}
                >
                  <Icon name="plus-circle" size={40} color={themeColor} style={{ marginRight: 15 }} />
                  <Text style={[styles.categoryName, { color: themeColor, fontWeight: 'bold' }]}>Criar Nova</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE SELEÇÃO DE CARTÃO (US-11) */}
      <Modal visible={cardModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: colors.surface, height: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Meus Cartões</Text>
              <TouchableOpacity onPress={() => setCardModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={creditCards}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => { setSelectedCard(item); setCardModalVisible(false); }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                    <Icon name="credit-card" size={28} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Limite: R$ {item.limit}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: 20 }}>
                      <Text style={{ color: colors.textMuted }}>Nenhum cartão cadastrado.</Text>
                      <TouchableOpacity 
                        style={{ marginTop: 10, padding: 10, backgroundColor: colors.accent, borderRadius: 10 }}
                        onPress={() => { setCardModalVisible(false); navigation.navigate('CreditCards'); }}
                      >
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cadastrar Cartão</Text>
                      </TouchableOpacity>
                  </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE SELEÇÃO DE CONTA (US-12) */}
      <Modal visible={accountModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: colors.surface, height: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Minhas Contas</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => { setSelectedAccount(item); setAccountModalVisible(false); }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                    <Icon name="bank" size={28} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.type}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: 20 }}>
                      <Text style={{ color: colors.textMuted }}>Nenhuma conta cadastrada.</Text>
                      <TouchableOpacity 
                        style={{ marginTop: 10, padding: 10, backgroundColor: colors.accent, borderRadius: 10 }}
                        onPress={() => { setAccountModalVisible(false); navigation.navigate('Accounts'); }}
                      >
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cadastrar Conta</Text>
                      </TouchableOpacity>
                  </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE CRIAÇÃO DE NOVA CATEGORIA */}
      <Modal visible={newCategoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { height: '85%', backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Personalizar</Text>
              <TouchableOpacity onPress={() => setNewCategoryModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewContainer}>
                <View style={[styles.previewCircle, { backgroundColor: newCategoryColor + '20' }]}>
                  <Icon name={newCategoryIcon as any} size={40} color={newCategoryColor} />
                </View>
                <Text style={[styles.previewName, { color: colors.text }]}>{newCategoryName || 'Novo'}</Text>
              </View>

              <TextInput
                style={[styles.cleanInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ESCOLHA UM ÍCONE</Text>
              <View style={styles.gridList}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.gridItem, { backgroundColor: colors.inputBg }, newCategoryIcon === icon && { borderColor: themeColor, borderWidth: 2 }]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <Icon name={icon as any} size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ESCOLHA UMA COR</Text>
              <View style={styles.gridList}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorItem, { backgroundColor: color }, newCategoryColor === color && { borderColor: colors.text, borderWidth: 3 }]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.mainSaveBtn, { backgroundColor: themeColor, marginTop: 30 }]}
                onPress={handleCreateCategory}
              >
                <Text style={styles.mainSaveBtnText}>Criar Categoria</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CRIAÇÃO DE NOVA TAG (US-27) */}
      <Modal visible={tagModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { height: '60%', backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Tag</Text>
              <TouchableOpacity onPress={() => setTagModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.cleanInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Nome da tag (Ex: Viagem, Aluguel)"
                value={newTagName}
                onChangeText={setNewTagName}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.sectionLabel}>ESCOLHA UMA COR</Text>
              <View style={styles.gridList}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorItem, { backgroundColor: color }, newTagColor === color && { borderColor: '#FFF', borderWidth: 3 }]}
                    onPress={() => setNewTagColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.mainSaveBtn, { backgroundColor: themeColor, marginTop: 30 }]}
                onPress={handleCreateTag}
              >
                <Text style={styles.mainSaveBtnText}>Criar Tag</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CONTACT PICKER MODAL */}
      <Modal visible={showContactPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { height: '70%', backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecione um Contato</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={contactList}
              keyExtractor={(item, index) => item.id || index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => {
                    setContactName(item.name);
                    setShowContactPicker(false);
                    Alert.alert('Sucesso', `Contato "${item.name}" selecionado!`);
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingBottom: 40 },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  backButton: { marginLeft: -10 },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginTop: 10 },
  card: { paddingHorizontal: 24, gap: 28 },
  valueSection: { alignItems: 'center' },
  valueLabel: { fontSize: 12, color: '#AAA', fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  valueInputRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  bigInput: { fontSize: 56, fontWeight: 'bold', padding: 0 },
  fieldGroup: { gap: 10 },
  fieldLabel: { fontSize: 14, color: '#888', fontWeight: '700', textTransform: 'uppercase' },
  pickerButton: { backgroundColor: '#F8F9FA', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
  pickerButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  miniCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cleanInput: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#F0F0F0', color: '#333' },
  mainSaveBtn: { padding: 22, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  mainSaveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  addCategoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  iconCircle: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  categoryName: { fontSize: 17, color: '#333', flex: 1, fontWeight: '500' },

  sectionLabel: { fontSize: 12, color: '#999', fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  previewContainer: { alignItems: 'center', marginBottom: 20 },
  previewCircle: { width: 100, height: 100, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  previewName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  gridList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  colorItem: { width: 45, height: 45, borderRadius: 22 },

  // STATUS STYLES (Restaurados)
  statusSection: { gap: 16, marginTop: 10 },
  verticalSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F5'
  },
  switchInfo: { flex: 1 },
  switchTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  switchSub: { fontSize: 12, color: '#AAA' },

  // PAYMENT METHOD STYLES
  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 6,
  },
  paymentLabel: { fontSize: 12, color: '#999', fontWeight: '600' },

  // RECEIPT PHOTO STYLES
  attachBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  attachBtnText: { fontSize: 15, fontWeight: '700' },
  attachBtnSub: { fontSize: 11, color: '#BBB' },
  receiptPreviewContainer: { alignItems: 'center', gap: 12 },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  receiptActions: { flexDirection: 'row', gap: 12 },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  receiptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // TOAST STYLES
  toastContainer: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', zIndex: 9999, paddingHorizontal: 20 },
  toastCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#F0F0F0', width: '100%', maxWidth: 400 },
  toastIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  toastTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  toastSub: { fontSize: 12, color: '#666' },

  // HELPER TEXT
  helperText: { fontSize: 11, color: '#AAA', marginTop: 4 },

  // SPRINT 3 TAGS STYLES
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tagChipSelected: {
    borderColor: '#000',
    borderWidth: 2,
  },
  tagChipText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
