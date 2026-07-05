import Swal from 'sweetalert2';

/**
 * تأكيد حذف عام بتصميم SweetAlert2 بدل confirm() الافتراضية بتاعة المتصفح.
 * بيرجع Promise<boolean> — true لو المستخدم أكد، false لو ألغى أو قفل الـ modal.
 *
 * الاستخدام:
 *   const confirmed = await confirmDelete();
 *   if (!confirmed) return;
 *
 * أو برسالة مخصصة:
 *   const confirmed = await confirmDelete('متأكد إنك عايز تمسح الطلب؟', 'مش هيترجع تاني.');
 */
export async function confirmDelete(
  title: string = 'متأكد إنك عايز تمسح ده؟',
  text: string = 'الإجراء ده نهائي ومش هيترجع.'
): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'أيوة، امسح',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#DC2626', // danger
    cancelButtonColor: '#64748B',  // steel
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'confirm-delete-popup',
      title: 'confirm-delete-title',
    },
  });

  return result.isConfirmed;
}
