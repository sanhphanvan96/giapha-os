/**
 * Removes all Vietnamese diacritics (tone/accent marks) from a string and converts it to lowercase.
 * Also replaces 'đ' and 'Đ' with 'd'.
 */
export const removeDiacritics = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
};
