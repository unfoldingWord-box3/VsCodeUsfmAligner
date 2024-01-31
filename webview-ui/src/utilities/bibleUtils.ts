/**
 * convert verse to number for sorting
 */
function getNumber(a:string): number {
  // @ts-ignore
  let number = parseInt(a);

  if (isNaN(number)) {
    if (a === 'front') {
      number = -1;
    } else {
      number = 10000000;
    }
  }
  return number;
}

// for sorting verses that are strings in numerical order
export const verseComparator = (a:string, b:string):number => {
  const diff = getNumber(a) - getNumber(b);
  return diff;
};

export function sortReferences(list: string[]): string[] {
  const sortedRefs = list.sort(verseComparator)
  return sortedRefs
}